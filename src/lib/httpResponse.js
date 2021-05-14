const createResponse = async (statusCode, data) => {
  return {
    statusCode,
    headers: { 
      "Access-Control-Allow-Origin": "*",
      "Connection": "Keep-Alive",
      "Keep-Alive": "timeout=5, max=1000"
    },
    body: JSON.stringify({
      statusCode,
      data
    }),
  }
}

export const success = async (data, code = 200) => {
  return await createResponse(code, data);
}

export const error = async (data, code = 500) => {
  return await createResponse(code, data);
}
  