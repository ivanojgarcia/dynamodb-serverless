## Inicialización de un proyecto Serverless.

`sls create -t aws-nodejs -n ms-tech-dynamo`

`npm init -y`

## Modificaciones en el archivo Serverless YML

Para esta sección se modificará el archivo YML en una primera instancia crearemos una función lambda que permitirá la manipulación de la data en dynamo.

1. Crearemos una carpeta con nombre de **src** y dentro de ella otra que se llame **handlers**
2. Crearemos una carpeta **lib** que incluirá las funciones de DynamoDB
3. Configuramos nuestro proyecto con sintaxis ES6. Para esto se debe hacer lo siguiente:

    ### Instalación de dependencias DEV Webpack.

    Instalamos las dependencias de desarrollo para Webpack:

    `npm install serverless-webpack webpack webpack-node-externals babel-loader @babel/core @babel/preset-env babel-plugin-source-map-support --save-dev`

    - **webpack-node-externals:** Esta biblioteca crea una función externa que ignora node_modules a empaquetar en Webpack.
    - **babel-loader:** Este paquete permite transpilar archivos JavaScript usando Babel y webpack .
    - **babel-plugin-source-map-support:** un complemento de Babel que automáticamente hace que los seguimientos de pila sean conscientes del mapa de origen

    ### Dependencias para mapas de Origen.

     Instalamos `npm install source-map-support --save`

    - **source-map-support:** Este módulo proporciona compatibilidad con mapas de origen para seguimientos de pila en el nodo a través de la API de seguimiento de pila V8 . Utiliza el módulo de mapa de origen para reemplazar las rutas y los números de línea de los archivos asignados en origen con sus rutas y números de línea originales.

    ### Adición del plugin en el archivo serverless.yml

    Agregamos el plugin de **serverless-webpack** en nuestro archivos **serverless.yml**

    ```yaml
    plugins:
        - serverless-webpack
    ```

    ### Creación de objeto personalizado

    Debemos crear un objeto personalizado en el **serverless.yml** con el fin de poder agregar nuestra configuración de webpack:

    ```yaml
    custom:
        webpack:
            webpackConfig: ./webpack.config.js
            includeModules: true # habilitar el empaquetado automático de módulos externos
    ```

    ### Creación de archivo Webpack de configuración

    Creación del archivo **webpack.config.js** en la raíz de nuestro directorio del proyecto. La función principal del archivo es de decirle a los paquetes web que archivos deben transformarse a través de babel con el ajuste de Es6 y cuales no.

    ```jsx
    const slsw = require("serverless-webpack");
    const nodeExternals = require("webpack-node-externals");

    module.exports = {
        entry: slsw.lib.entries,
        target: "node",
        // Generate sourcemaps for proper error messages
        devtool: 'source-map',
        // Since 'aws-sdk' is not compatible with webpack,
        // we exclude all node dependencies
        externals: [nodeExternals()],
        mode: slsw.lib.webpack.isLocal ? "development" : "production",
        optimization: {
            // We do not want to minimize our code.
            minimize: false
        },
        performance: {
            // Turn off size warnings for entry points
            hints: false
        },
        // Run babel on all .js files and skip those in node_modules
        module: {
            rules: [
                {
                    test: /\.js$/,
                    loader: "babel-loader",
                    include: __dirname,
                    exclude: /node_modules/
                }
            ]
        }
    };
    ```

    ### Creación de archivo .babelrc

    Crearemos en nuestro directorio raíz el archivo `.babelrc` 

    ```json
    {
        "plugins": ["source-map-support"],
        "presets": [
            [
                "@babel/preset-env",
                {
                    "targets": {
                        "node": "8.10"
                    }
                }
            ]
        ]
    }
    ```

4. Agregaremos en el directorio **lib** un método para estandarizar las respuestas y manejar las respuestas **success** y de **error** (`httpResponse.js`)

    ```jsx
    const createResponse = (statusCode, data) => {
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
      
      export const success = (data, code = 200) => {
        return createResponse(code, data);
      }
      
      export const error = (data, code = 500) => {
        return createResponse(code, data);
      }
    ```

5. Crearemos nuestro método para administrar los usuarios en este caso **createUser.js** en el directorio `./src/handlers/`  incorporaremos nuestra librería para  manejar las respuestas del servidor. Iniciaremos con el siguiente extracto de código.

    ```jsx
    import { success } from '../lib/httpResponse'

    export const handler = async (event) => {
    	const res = "Hello World"
      return await success(res)
    };
    ```

6. Creamos nuestra función lambda

    ```yaml
    functions:
      createUser:
        handler: src/handlers/createUser.handler
        events:
          - http:
              method: POST
              path: /user
    ```

7. Para almacenar la información incluiremos un recurso en nuestro **serverless.yml** con el fin de poder crear nuestra tabla, importante resaltar que en este punto se deben definir los indices de búsqueda.

    Crearemos un archivo de nombre `user.yml` pero antes debemos crear un directorio en **src** con el nombre de **resources** y dentro de ella la que contendrá las tablas, con esto quedaría la ruta de la siguiente forma con el archivo `./src/resources/tables/user.yml` ****y la siguiente información:

    ```jsx
    UserDBTable:
      Type: 'AWS::DynamoDB::Table'
    	DeletionPolicy: Retain # Previene la eliminación accidentañ de la tabla
      Properties:
        TableName: ${self:provider.environment.USER_TABLE}
        PointInTimeRecoverySpecification:
            PointInTimeRecoveryEnabled: true
        AttributeDefinitions:
          - AttributeName: id
            AttributeType: S
          - AttributeName: email
            AttributeType: S
        KeySchema:
          - AttributeName: id
            KeyType: HASH
        BillingMode: PAY_PER_REQUEST
        GlobalSecondaryIndexes:
          - IndexName: emailIndex
            KeySchema:
              - AttributeName: email
                KeyType: HASH
            Projection:
              ProjectionType: ALL
    ```

    Notemos que en el nombre de la tabla colocamos la variable de entorno `provider.environment.USER_TABLE`  por lo que tenemos que incluirlo en nuestro archivo **serverless.yml**

8. Crear un archivo de configuración que contendrá las variables de entorno, importante considerar que este archivo será creado por cada ambiente (stage). Para fines de desarrollo crearemos nuestro archivo `config.dev.json`  dentro de un directorio `config` en `src` raíz. `./src/config/config.dev.json` 

    ### Serverless.yml

    Agregaremos los **environment** dentro de nuestro archivo, importante **debemos agregar la siguiente línea dentro de provider**

    ```yaml
    provider:

    	# Algunas configuraciones anteriores ...

    	environment:
    		USER_TABLE: tb-${self:provider.stage}-${file(src/config/config.${self:provider.stage}.json):USER_TABLE}
    ```

    ### config.dev.json

    ```json
    {
        "USER_TABLE": "users"
    }
    ```

    > 🔔 En este caso para fines práctico se separó del archivo `serverless.yml` a una variable environment desde un archivo JSON externo.

9. Importamos los recursos de nuestra tabla desde nuestro archivo **user.yml** en este caso dentro de nuestro **serverless.yml** agregamos el resources creado incorporando el siguiente código:

    ```yaml
    resources:
      Resources:
        UserDBTable: ${file(src/resources/tables/user.yml):UserDBTable}
    ```

    **Felicidades con esto ya puedes desplegar por medio del comando** `sls deploy`  **tu aplicativo generándote un endpoint y creando la tabla en nuestra Base de datos DynamoDB**

## Creando nuestro servicio para insertar datos:

Primero que nada deberemos instalar algunas dependencias node que utilizaremos para poder desarrollar este y otros servicio. Las dependencias que estaremos instalando serán las siguientes:

- **uuid**: Para la generación de IDs de tipo UUID
- **aws-sdk**: Para poder interactuar con nuestra Base de datos DynamoDB
- **luxon**: Manipulación de fechas
- **serverless-pseudo-parameters**: Para utilizar los pseudo parámetros  de CloudFormation

```bash
~ npm i uuid aws-sdk luxon
~ sls plugin install -n serverless-pseudo-parameters
```

### Desarrollando nuestro servicio.

Nuestro handler servirá como orquestador de nuestras funciones, para ello este invocará una función que será quien tendrá toda la lógica de almacenamiento y validación de datos.

### Creación de nuestro modelo User.

Lo primero será crear un directorio que contendrá todos los modelos o entidades de nuestro servicio, este directorio estará en dentro de `./src` con el nombre de `models` y adentro de éste nuestro archivo `user.js`

En este archivo se encontrará todas las acciones asociada a user (crear, leer, editar y eliminar).

Para fines del tutorial crearemos la acción `createUser`

### Hagamos algo antes y organicemos la interacción con DynamoDB

Para evitar la redundancia centralizaremos todas las funciones internas de DynamoDB como query, put y update.

Para ello crearemos un archivo que contendrá esta funcionalidad dentro del directorio `lib` de nombre `dynamoDB.js`

### Función para crear un registro.

Este tendrá el siguiente código:

```jsx
import AWS from "aws-sdk"
const dynamoDB = new AWS.DynamoDB.DocumentClient()

export const createItem = async (TableName, Item) => {
    const params = {
        TableName,
        Item
    };
    await dynamoDB.put(params).promise()
    return item;
}
```

Expliquemos un poco, las acciones en dynamoDB posee un atributo que contiene algunos parámetro puntuales como lo son el nombre de la tabla y los atributos del registro a insertar o actualizar, por lo que utilizaremos las variables `TableName` y `Item` para la función de `createItem` 

- **TableName:** Nombre de la tabla.
- **Item:** Los atributos del registro.

Ya teniendo creado nuestra función para Agregar registros a nuestra Tabla de Usuarios, es el momento de crear nuestro **handler**, para ello invocaremos el modelo **user** que contiene la lógica necesaria para crear los registros, recibiendo la información del Body enviado.

Antes debemos crear la función `createUser`  en nuestro modelo `user` el cual internamente contiene la llamada a nuestra función de DynamoDB para insertar registros (creada anteriormente)

```jsx
import { v4 as uuid } from "uuid"
import { DateTime } from "luxon";
import { createItem } from "../lib/dynamoDB";
const tableName = process.env.USER_TABLE;

export const createUser = async body => {
    const now = DateTime.now();
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
```

Ya con la función de `createUser` podemos invocar y culminar nuestro handler.

```jsx
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
```

### Inclusión del role IAM para la tabla User

Es importante señalar que es necesario asignar el role IAM para poder permitirle acciones a nuestra tabla.

Para ello crearemos un archivo `UserTableIAM` que contendrá la configuración necesaria para la manipulación y gestión de nuestra tabla. Este debe contener lo siguiente:

```yaml
UserTableIAM:
  Effect: Allow
  Action:
    - dynamodb:PutItem
  Resource:
    - "arn:aws:dynamodb:#{AWS::Region}:#{AWS::AccountId}:table/${self:provider.environment.USER_TABLE}"
```

 Paso siguiente, agregar en nuestro `serverless.yml` la configuración de **iamRoleStatements** importando los recursos y acciones para nuestra tabla desde el archivo `src/iam/UserTableIAM.yml`

```yaml
provider: 
	...
	iamRoleStatements:
	  - ${file(src/iam/UserTableIAM.yml):UserTableIAM}
```

### Optimizando nuestro `serverless.yml`

Configuremos un poco nuestro `serverless.yml` y referenciemos nuestro **arn** de nuestro recurso dynamo para nuestros permisos **iam.** ¿Cómo haremos eso? De la siguiente forma:

- Crearemos una configuración custom.

```yaml
custom:
	...
  UserTable:
    name: !Ref UserDBTable
    arn: !GetAtt UserDBTable.Arn
```

- Tomaremos las referencias de la tabla.
- Asignamos la referencia en nuestro archivo `UserTableIAM.yml`

```yaml
UserTableIAM:
  Effect: Allow
  Action:
    - dynamodb:PutItem
  Resource:
    - ${self:custom.UserTable.arn}
```

 

Nuestro `serverless.yml` debería lucir así:

```yaml
service: ms-tech-dynamo
frameworkVersion: '2'

package:
  individually: true

provider:
  name: aws
  runtime: nodejs12.x
  lambdaHashingVersion: 20201221
  stage: ${opt:stage, 'dev'}
  iamRoleStatements:
    - ${file(src/iam/UserTableIAM.yml):UserTableIAM}

  environment:
    USER_TABLE: tb-${self:provider.stage}-${file(src/config/config.${self:provider.stage}.json):USER_TABLE}

resources:
  Resources:
    UserDBTable: ${file(src/resources/tables/user.yml):UserDBTable}

functions:
  createUser:
    handler: src/handlers/createUser.handler
    events:
      - http:
          method: POST
          path: /user

plugins:
  - serverless-webpack
  - serverless-offline
  - serverless-pseudo-parameters
custom:
  UserTable:
    name: !Ref UserDBTable
    arn: !GetAtt UserDBTable.Arn
  webpack:
    webpackConfig: ./webpack.config.js
    includeModules: true # enable auto-packing of external modules
  serverless-offline:
    useChildProcesses: true
```

Ahora solo queda desplegar nuestra función ejecutando `sls deploy -s dev`

Al finalizar el despliegue podemos agregar nuestro body y probarlo.

En este caso nuestro body sería:

```json
{
    "name": "Ivano",
    "lastName": "García",
    "email": "ivano.garcia@globant.com",
    "country": "Chile",
    "city": "santiago",
    "hobbies": [
        "pintura",
        "música",
        "comer"
    ]
}
```

## Creando nuestro servicio para obtener datos.

Crearemos ahora nuestro servicio para obtener los datos de nuestra BD por medio de una función lambda que agregaremos en nuestro `serverless.yml`

```yaml
functions:
	...
  getUsers:
    handler: src/handlers/getUsers.handler
    events:
      - http:
          method: GET
          path: /users
```

Creamos nuestro handler `getUsers` 

```jsx
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
```

Agregamos en nuestro modelo la función `getUsers`

```jsx
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
```

Creamos nuestra acción `getItems` el cual utiliza método **scan** de DyanmoDB.

```jsx
export const getItems = async (TableName) => {
    const params = {
        TableName
    };
    const res = await dynamoDB.scan(params).promise();
    return res.Items;
}
```

Asignamos la acción `- dynamodb:Scan` en `UserTableIAM`