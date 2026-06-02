const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api/clientes',    require('./routes/clientes'));
app.use('/api/computadores',require('./routes/computadores'));
app.use('/api/sessoes',     require('./routes/sessoes'));
app.use('/api/produtos',    require('./routes/produtos'));
app.use('/api/caixa',       require('./routes/caixa'));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () =>
    console.log(`Arena Gamer API → http://localhost:${PORT}`)
);
