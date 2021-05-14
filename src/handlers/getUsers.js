import { v4 as uuid } from 'uuid';

import { success, error } from '../lib/httpResponse';
import { getUsers } from '../models/user';

export const handler = async (event) => {
  try {
    const users = await getUsers();
    if(users.error) throw new Error(users.message);
    return success(users);
  } catch (err) {
    return error(err.message);
  }
};