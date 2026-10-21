import journal from '../../../drizzle/meta/_journal.json';
import initial from '../../../drizzle/0000_initial.sql';

export const migrations = { journal, migrations: { m0000: initial } };
