const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/clientes (Só traz os clientes ATIVOS)
router.get('/', async (req, res) => {
    try {
        const [clientes] = await db.query('SELECT * FROM clientes WHERE ativo = 1 ORDER BY nome ASC');
        res.json(clientes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar clientes.' });
    }
});

// GET /api/clientes/ranking 
router.get('/ranking', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id_cliente,
                c.nome,
                COUNT(DISTINCT s.id_sessao) AS total_sessoes,
                COALESCE(SUM(v.valor_total), 0) + COALESCE((SELECT SUM(fn_valor_sessao(s2.id_sessao)) FROM sessoes s2 WHERE s2.id_cliente = c.id_cliente AND LOWER(s2.status) = 'fechada'), 0) AS total_gasto,
                (COALESCE(SUM(v.valor_total), 0) + COALESCE((SELECT SUM(fn_valor_sessao(s2.id_sessao)) FROM sessoes s2 WHERE s2.id_cliente = c.id_cliente AND LOWER(s2.status) = 'fechada'), 0)) / NULLIF(COUNT(DISTINCT s.id_sessao), 0) AS gasto_medio
            FROM clientes c
            LEFT JOIN sessoes s ON c.id_cliente = s.id_cliente AND LOWER(s.status) = 'fechada'
            LEFT JOIN vendas v ON c.id_cliente = v.id_cliente
            WHERE c.ativo = 1
            GROUP BY c.id_cliente
            ORDER BY total_gasto DESC
        `;
        const [ranking] = await db.query(query);
        res.json(ranking);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar ranking de clientes.' });
    }
});

// POST /api/clientes (CRIAR NOVO)
router.post('/', async (req, res) => {
    const { nome, cpf, telefone } = req.body;

    if (!nome || !cpf) {
        return res.status(400).json({ error: 'O Nome e o CPF são obrigatórios.' });
    }

    try {
        await db.query('INSERT INTO clientes (nome, cpf, telefone) VALUES (?, ?, ?)', [nome, cpf, telefone]);
        res.status(201).json({ message: 'Cliente cadastrado com sucesso!' });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Este CPF já está cadastrado no sistema.' });
        }
        res.status(500).json({ error: 'Erro interno ao cadastrar o cliente.' });
    }
});

// PUT /api/clientes/:id (EDITAR EXISTENTE)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, cpf, telefone } = req.body;

    if (!nome || !cpf) {
        return res.status(400).json({ error: 'O Nome e o CPF são obrigatórios.' });
    }

    try {
        await db.query(
            'UPDATE clientes SET nome = ?, cpf = ?, telefone = ? WHERE id_cliente = ?',
            [nome, cpf, telefone, id]
        );
        res.json({ message: 'Dados do cliente atualizados com sucesso!' });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Este CPF já está cadastrado em outro cliente.' });
        }
        res.status(500).json({ error: 'Erro interno ao atualizar o cliente.' });
    }
});

// DELETE /api/clientes/:id (EXCLUSÃO LÓGICA)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('UPDATE clientes SET ativo = 0 WHERE id_cliente = ?', [id]);
        res.json({ message: 'Cliente removido do sistema com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno ao tentar remover o cliente.' });
    }
});

module.exports = router;