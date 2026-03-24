import Express from 'express';

const app = Express();
app.get('/hello', (req, res) => {
    res.send('Hello world!');
});

app.get('/goodbye', (req, res) => {
    res.send('Goodbye world!');
});

app.listen(3000, () => {
    console.log(`Example app listening on port 3000`);
});
