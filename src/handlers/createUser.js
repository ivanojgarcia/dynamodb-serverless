import { v4 as uuid } from 'uuid';

import { success, error } from '../lib/httpResponse';
import { createUser } from '../models/user';

export const handler = async (event) => {
  const body = JSON.parse(event.body);
  try {  
    if(!body) return error("The body is require.", 400);
    const userCreated = await createUser(body);
    if(userCreated.error) throw new Error(userCreated.message);
    return success(userCreated);
  } catch (err) {
    return error(err.message);
  }
};