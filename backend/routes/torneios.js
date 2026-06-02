const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/torneios (Listar os ativos)
router.get('/', async (req, res) => {
    try {
        const [torneios] = await db.query('SELECT * FROM torneios WHERE data_inicio >= CURDATE()');
        res.json(torneios);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar torneios.' });
    }
});

// POST /api/torneios/inscrever (Chama a sua Procedure!)
router.post('/inscrever', async (req, res) => {
    const { id_cliente, id_torneio } = req.body;
    
    try {
        // Chamando a procedure que voce criou no banco
        await db.query('CALL sp_inscrever_torneio(?, ?)', [id_cliente, id_torneio]);
        res.status(200).json({ message: 'Inscricao realizada com sucesso!' });
    } catch (err) {
        res.status(400).json({ error: err.sqlMessage || 'Erro ao inscrever.' });
    }
});

module.exports = router;