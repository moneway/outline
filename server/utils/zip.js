// @flow
import fs from 'fs';
import JSZip from 'jszip';
import tmp from 'tmp';
import unescape from '../../shared/utils/unescape';
import { Attachment, Collection, Document } from '../models';
import { getImageByKey } from './s3';
import bugsnag from 'bugsnag';

async function addToArchive(zip, documents) {
  for (const doc of documents) {
    const document = await Document.findByPk(doc.id);
    let text = unescape(document.text);

    const attachments = await Attachment.findAll({
      where: { documentId: document.id },
    });

    for (const attachment of attachments) {
      await addImageToArchive(zip, attachment.key);
      text = text.replace(attachment.redirectUrl, encodeURI(attachment.key));
    }

    zip.file(`${document.title}.md`, text);

    if (doc.children && doc.children.length) {
      const folder = zip.folder(document.title);
      await addToArchive(folder, doc.children);
    }
  }
}

async function addImageToArchive(zip, key) {
  try {
    const img = await getImageByKey(key);
    zip.file(key, img, { createFolders: true });
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      bugsnag.notify(err);
    } else {
      // error during file retrieval
      console.error(err);
    }
  }
}

async function archiveToPath(zip) {
  return new Promise((resolve, reject) => {
    tmp.file({ prefix: 'export-', postfix: '.zip' }, (err, path) => {
      if (err) return reject(err);

      zip
        .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
        .pipe(fs.createWriteStream(path))
        .on('finish', () => resolve(path))
        .on('error', reject);
    });
  });
}

export async function archiveCollection(collection: Collection) {
  const zip = new JSZip();

  if (collection.documentStructure) {
    await addToArchive(zip, collection.documentStructure);
  }

  return archiveToPath(zip);
}

export async function archiveCollections(collections: Collection[]) {
  const zip = new JSZip();

  for (const collection of collections) {
    if (collection.documentStructure) {
      const folder = zip.folder(collection.name);
      await addToArchive(folder, collection.documentStructure);
    }
  }
  return archiveToPath(zip);
}
