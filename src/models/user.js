import { v4 as uuid } from "uuid"
import { DateTime } from "luxon";
import { createItem, getItems } from "../lib/dynamoDB";
const tableName = process.env.USER_TABLE;

export const createUser = async body => {
    const now = DateTime.now().toString();
    const id = uuid();
    const item = {
        ...body,
        id,
        createdAt: now
    }
    try {
        const itemCreated = await createItem(tableName, item);
        return itemCreated;
    } catch (err) {
        return {
            err: true,
            message: err.message
        }
    }
}
export const getUsers = async () => {
    try {
        const items = await getItems(tableName);
        return items;
    } catch (err) {
        return {
            err: true,
            message: err.message
        }
    }
}
export const updateItem = async body => {
    try {
        const items = await getItems(tableName);
        return items;
    } catch (err) {
        return {
            err: true,
            message: err.message
        }
    }
}