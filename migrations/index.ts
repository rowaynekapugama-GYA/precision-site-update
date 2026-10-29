import * as migration_20261009_025616_initial from './20261009_025616_initial';
import * as migration_20261014_011040_revisions_20261014 from './20261014_011040_revisions_20261014';
import * as migration_20261019_074239_client_round_2_20261019 from './20261019_074239_client_round_2_20261019';
import * as migration_20261028_004622_blob_object_key from './20261028_004622_blob_object_key';

export const migrations = [
  {
    up: migration_20261009_025616_initial.up,
    down: migration_20261009_025616_initial.down,
    name: '20261009_025616_initial',
  },
  {
    up: migration_20261014_011040_revisions_20261014.up,
    down: migration_20261014_011040_revisions_20261014.down,
    name: '20261014_011040_revisions_20261014',
  },
  {
    up: migration_20261019_074239_client_round_2_20261019.up,
    down: migration_20261019_074239_client_round_2_20261019.down,
    name: '20261019_074239_client_round_2_20261019',
  },
  {
    up: migration_20261028_004622_blob_object_key.up,
    down: migration_20261028_004622_blob_object_key.down,
    name: '20261028_004622_blob_object_key'
  },
];
