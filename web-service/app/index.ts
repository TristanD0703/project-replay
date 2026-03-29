import Express from 'express';
import DatabaseConnection from './db';

DatabaseConnection.connect();

const app = Express();
app.get('/hello', async (req, res) => {
    const conn = DatabaseConnection.getConnection();
    const resp = await conn.selectFrom('user').selectAll().execute();
    console.log(resp);
    res.send('Hello world!');
});

app.get('/goodbye', (req, res) => {
    res.send('Goodbye world!');
});

app.listen(8080, () => {
    console.log(`Example app listening on port 3000`);
});
