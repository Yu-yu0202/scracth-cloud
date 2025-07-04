import { conn } from "../utils/websocket.esm";

describe('CloudVariable', () => {
    jest.setTimeout(20000);

    const projectId = '1194614729';
    const username = 'yu-yu0202';
    const variables = [
        '☁ Test1',
        '☁ Test2',
        '☁ Test3-Const'
    ];

    let connection: conn;
    beforeAll(async () => {
        connection = new conn(projectId, username);
        await connection.createConnection();
    });
    afterAll(() => {
        connection.closeConnection();
    });

    test('クラウド変数の値が取得できる', async () => {
        let value: (number | string | null)[] = [];
        variables.forEach(async (x) => {
            value.push(await connection?.get_var(x));
        })
        
    })
})