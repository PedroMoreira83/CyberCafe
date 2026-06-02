const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/caixa (Histórico Geral Unificado)
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                v.id_venda AS id,
                c.nome AS cliente,
                p.nome_produto AS descricao,
                v.quantidade,
                v.valor_total AS valor,
                v.data_venda AS data_raw,
                'Consumo' AS tipo
            FROM vendas v
            JOIN clientes c ON v.id_cliente = c.id_cliente
            JOIN produtos p ON v.id_produto = p.id_produto

            UNION ALL

            SELECT 
                s.id_sessao AS id,
                c.nome AS cliente,
                CONCAT('Sessao PC ', comp.numero_computador) AS descricao,
                1 AS quantidade,
                fn_valor_sessao(s.id_sessao) AS valor,
                IFNULL(s.fim_sessao, s.inicio_sessao) AS data_raw,
                'Sessao' AS tipo
            FROM sessoes s
            JOIN clientes c ON s.id_cliente = c.id_cliente
            JOIN computadores comp ON s.id_computador = comp.id_computador
            WHERE LOWER(s.status) = 'fechada'
            
            ORDER BY data_raw DESC
            LIMIT 50
        `;
        const [caixa] = await db.query(query);

        // Mapeamento com "Shotgun" de propriedades para cobrir qualquer exigência do front
        const caixaFormatado = caixa.map(item => {
            const v = parseFloat(item.valor) || 0;
            
            return {
                // --- SHOTGUN DE IDENTIFICADORES (Para matar o 'undefined' do #) ---
                id: item.id,
                id_transacao: item.id,
                numero: item.id,
                id_venda: item.id,
                id_sessao: item.id,
                id_log: item.id,
                codigo: item.id,
                num: item.id,
                id_caixa: item.id,

                // --- DADOS BÁSICOS ---
                cliente: item.cliente,
                nome_cliente: item.cliente,
                descricao: item.descricao,
                quantidade: item.quantidade,
                tipo: item.tipo,

                // --- SHOTGUN DE VALORES E MATEMÁTICA (Para ativar os Cards de Totais lá em cima) ---
                valor: v,
                valor_total: v,
                total: v,
                preco: v,
                subtotal: v,
                monto: v,
                entrada: v,       // Muito provável que o front use este para somar as Entradas
                entradas: v,
                total_entrada: v,
                saida: 0,         // Como tudo aqui é ganho, definimos saídas como zero
                saidas: 0,
                total_saida: 0,
                credito: v,
                debito: 0,

                // --- SHOTGUN DE FLUXO/NATUREZA ---
                movimentacao: 'Entrada',
                operacao: 'Entrada',
                natureza: 'Entrada',
                fluxo: 'Entrada',
                categoria: 'Entrada',
                tipo_movimentacao: 'Entrada',
                is_entrada: true,
                is_saida: false,

                // --- SHOTGUN DE DATAS (Envia o objeto bruto do banco para o front formatar nativamente) ---
                data: item.data_raw,
                data_hora: item.data_raw,
                data_venda: item.data_raw,
                data_fim: item.data_raw,
                data_transacao: item.data_raw,
                data_log: item.data_raw,
                data_lancamento: item.data_raw,
                created_at: item.data_raw
            };
        });

        res.json(caixaFormatado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar os dados do caixa.' });
    }
});

// GET /api/caixa/resumo (Contas pendentes por cliente)
router.get('/resumo', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id_cliente,
                c.nome AS cliente,
                (
                    SELECT COALESCE(SUM(fn_valor_sessao(s.id_sessao)), 0) 
                    FROM sessoes s 
                    WHERE s.id_cliente = c.id_cliente AND LOWER(s.status) = 'fechada'
                ) AS total_sessoes,
                (
                    SELECT COALESCE(SUM(v.valor_total), 0) 
                    FROM vendas v 
                    WHERE v.id_cliente = c.id_cliente
                ) AS total_produtos
            FROM clientes c
            HAVING (total_sessoes + total_produtos) > 0
        `;
        const [resumo] = await db.query(query);

        const resumoProcessado = resumo.map(item => {
            const total = parseFloat(item.total_sessoes) + parseFloat(item.total_produtos);
            const desconto = total * 0.05; 
            return {
                id_cliente: item.id_cliente,
                cliente: item.cliente,
                total_sessoes: parseFloat(item.total_sessoes).toFixed(2),
                total_produtos: parseFloat(item.total_produtos).toFixed(2),
                valor_total: total.toFixed(2),
                valor_com_desconto: (total - desconto).toFixed(2)
            };
        });

        res.json(resumoProcessado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar o resumo financeiro.' });
    }
});

// POST /api/caixa/consumo (Registro de venda avulsa amarrada ao cliente)
router.post('/consumo', async (req, res) => {
    const { id_cliente, id_produto, Industrial, quantidade } = req.body;
    const idClienteFinal = id_cliente || req.body.id;

    if (!idClienteFinal || !id_produto || !quantidade) {
        return res.status(400).json({ error: 'O cliente, o produto e a quantidade são obrigatórios.' });
    }

    try {
        await db.query('CALL sp_registrar_consumo(?, ?, ?)', [idClienteFinal, id_produto, quantidade]);
        res.status(201).json({ message: 'Venda registrada com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.sqlMessage || 'Erro interno ao registrar a venda.' });
    }
});

module.exports = router;