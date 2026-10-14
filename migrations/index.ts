import * as migration_20261009_025616_initial from './20261009_025616_initial';
import * as migration_20261014_011040_revisions_20261014 from './20261014_011040_revisions_20261014';

export const migrations = [
  {
    up: migration_20261009_025616_initial.up,
    down: migration_20261009_025616_initial.down,
    name: '20261009_025616_initial',
  },
  {
    up: migration_20261014_011040_revisions_20261014.up,
    down: migration_20261014_011040_revisions_20261014.down,
    name: '20261014_011040_revisions_20261014'
  },
];
