const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/produtos
// Retorna todos os produtos traduzidos para o contrato do Frontend (APENAS OS ATIVOS)
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                id_produto, 
                nome_produto AS nome, 
                'Bomboniere' AS categoria, /* Coluna inventada para nao quebrar o layout */
                valor_produto AS preco, 
                estoque 
            FROM produtos 
            WHERE ativo = 1 /* Filtro do Soft Delete */
            ORDER BY nome_produto ASC
        `;
        const [produtos] = await db.query(query);
        res.json(produtos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar a lista de produtos.' });
    }
});

// POST /api/produtos (CRIAR NOVO PRODUTO)
router.post('/', async (req, res) => {
    // O front envia 'nome' e 'preco', mas nos salvamos nas colunas corretas do seu banco
    const { nome, preco, estoque } = req.body;
    
    if (!nome || preco === undefined) {
        return res.status(400).json({ error: 'O Nome e o Preco sao obrigatorios.' });
    }

    try {
        await db.query(
            'INSERT INTO produtos (nome_produto, valor_produto, estoque) VALUES (?, ?, ?)', 
            [nome, preco, estoque || 0]
        );
        res.status(201).json({ message: 'Produto cadastrado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno ao cadastrar o produto.' });
    }
});

// PUT /api/produtos/:id (EDITAR E REPOR ESTOQUE)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, preco, estoque } = req.body;

    if (!nome || preco === undefined) {
        return res.status(400).json({ error: 'O Nome e o Preco sao obrigatorios.' });
    }

    try {
        await db.query(
            'UPDATE produtos SET nome_produto = ?, valor_produto = ?, estoque = ? WHERE id_produto = ?',
            [nome, preco, estoque, id]
        );
        res.json({ message: 'Produto atualizado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno ao atualizar o produto.' });
    }
});

// DELETE /api/produtos/:id (EXCLUSAO LOGICA)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('UPDATE produtos SET ativo = 0 WHERE id_produto = ?', [id]);
        res.json({ message: 'Produto removido do catalogo com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno ao tentar remover o produto.' });
    }
});

// GET /api/produtos/mais-vendidos
// Retorna produtos ranqueados pela quantidade vendida.
router.get('/mais-vendidos', async (req, res) => {
    try {
        // Garantindo os nomes corretos mesmo se a view usar os nomes originais da tabela
        const query = `
            SELECT 
                nome_produto AS nome, 
                'Bomboniere' AS categoria, 
                total_vendido, 
                receita_total 
            FROM vw_produtos_mais_vendidos 
            ORDER BY receita_total DESC
        `;
        const [ranking] = await db.query(query);
        res.json(ranking);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar o ranking de produtos. Verifique se a view existe.' });
    }
});

// POST /api/produtos/vender
// Registra uma venda de produto vinculada a uma sessao ativa.
router.post('/vender', async (req, res) => {
    const { id_sessao, id_produto, quantidade } = req.body;
    
    if (!id_sessao || !id_produto || !quantidade) {
        return res.status(400).json({ error: 'id_sessao, id_produto e quantidade sao obrigatorios.' });
    }
    
    try {
        // 1. Busca o preco atual do produto no banco
        const queryPreco = 'SELECT valor_produto FROM produtos WHERE id_produto = ?';
        const [produto] = await db.query(queryPreco, [id_produto]);
        
        if (produto.length === 0) {
            return res.status(404).json({ error: 'Produto nao encontrado.' });
        }
        
        const precoUnitario = produto[0].valor_produto;
        
        // 2. Insere na tabela 'vendas'
        const queryVenda = 'INSERT INTO vendas (id_sessao, id_produto, quantidade, preco_unitario) VALUES (?, ?, ?, ?)';
        await db.query(queryVenda, [id_sessao, id_produto, quantidade, precoUnitario]);
        
        // Se os triggers trg_valida_estoque e trg_atualiza_estoque estiverem no seu schema, 
        // eles rodarao sozinhos no banco de dados aqui!
        res.status(201).json({ message: 'Venda registrada com sucesso!' });
    } catch (err) {
        console.error(err);
        // O err.sqlMessage vai jogar a mensagem de erro do Trigger direto para a tela, caso nao tenha estoque!
        res.status(400).json({ error: err.sqlMessage || 'Erro ao registrar a venda.' });
    }
});

module.exports = router;