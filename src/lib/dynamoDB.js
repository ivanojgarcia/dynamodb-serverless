import AWS from "aws-sdk";
const dynamoDB = new AWS.DynamoDB.DocumentClient();

export const createItem = async (TableName, Item) => {
    const params = {
        TableName,
        Item
    };
    await dynamoDB.put(params).promise()
    return Item;
}
export const getItems = async (TableName) => {
    const params = {
        TableName
    };
    const res = await dynamoDB.scan(params).promise();
    return res.Items;
}