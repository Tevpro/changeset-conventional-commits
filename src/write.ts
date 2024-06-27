import fs from 'node:fs/promises';
import path from 'path';
import prettier from 'prettier';

import type { ChangesetConventionalCommit } from './types';

function getPrettierInstance(cwd: string): typeof prettier {
  try {
    return require(require.resolve('prettier', { paths: [cwd] }));
  } catch (err) {
    if (!err || (err as { code: string }).code !== 'MODULE_NOT_FOUND') {
      throw err;
    }
    return prettier;
  }
}

async function writeChangeset(changeset: ChangesetConventionalCommit, cwd: string): Promise<string> {
  const { summary, releases } = changeset;

  const changesetBase = path.resolve(cwd, '.changeset');

  // generate changeset ID based on commit date and hash
  const changesetID = formatDate(changeset) + '-' + changeset.hash!.slice(0, 8);

  const prettierInstance = getPrettierInstance(cwd);
  const prettierConfig = await prettierInstance.resolveConfig(cwd);

  const newChangesetPath = path.resolve(changesetBase, `${changesetID}.md`);

  // NOTE: The quotation marks in here are really important even though they are
  // not spec for yaml. This is because package names can contain special
  // characters that will otherwise break the parsing step
  const changesetContents = `---
${releases.map((release) => `"${release.name}": ${release.type}`).join('\n')}
---

${summary}
  `;

  // Prettier v3 returns a promise
  const contents = await prettierInstance.format(changesetContents, {
    ...prettierConfig,
    parser: 'markdown',
  });

  await fs.writeFile(newChangesetPath, contents);

  return changesetID;
}

export default writeChangeset;

function formatDate(changeset: ChangesetConventionalCommit) {
  const date = changeset.date!;
  const year = date.getUTCFullYear();
  const month = ('0' + (date.getUTCMonth() + 1)).slice(-2); // Months are 0-based, so add 1 and pad with 0 if necessary
  const day = ('0' + date.getUTCDate()).slice(-2); // Pad with 0 if necessary
  const hours = ('0' + date.getUTCHours()).slice(-2); // Pad with 0 if necessary
  const minutes = ('0' + date.getUTCMinutes()).slice(-2); // Pad with 0 if necessary
  const seconds = ('0' + date.getUTCSeconds()).slice(-2); // Pad with 0 if necessary

  const formattedDate = year + month + day + hours + minutes + seconds;
  return formattedDate;
}
