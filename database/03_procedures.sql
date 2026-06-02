USE arena_gamer;

-- ????????????????????????????????????????????????????????????????????????????
--  1. FUNÇÕES E PROCEDURES (Regras de Negócio e Cálculos)
-- ????????????????????????????????????????????????????????????????????????????

DELIMITER //

DROP FUNCTION IF EXISTS fn_valor_sessao //
CREATE FUNCTION fn_valor_sessao (p_id_sessao INT) RETURNS DECIMAL(10,2) READS SQL DATA
BEGIN
    DECLARE v_inicio DATETIME;
    DECLARE v_preco_hora DECIMAL(10,2);
    DECLARE v_horas DECIMAL(8,4);
    
    SELECT inicio_sessao, valor_hora INTO v_inicio, v_preco_hora
    FROM sessoes WHERE id_sessao = p_id_sessao;
    
    SET v_horas = TIMESTAMPDIFF(MINUTE, v_inicio, NOW()) / 60.0;
    RETURN ROUND(GREATEST(v_horas, 0.25) * v_preco_hora, 2);
END //

DROP FUNCTION IF EXISTS fn_categoria_cliente //
CREATE FUNCTION fn_categoria_cliente (p_id_cliente INT) RETURNS VARCHAR(10) READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(10,2);
    SELECT COALESCE(SUM(fn_valor_sessao(id_sessao)), 0) INTO v_total 
    FROM sessoes 
    WHERE id_cliente = p_id_cliente AND status = 'Fechada';
    
    IF v_total >= 100.00 THEN RETURN 'Ouro';
    ELSEIF v_total >= 40.00 THEN RETURN 'Prata';
    ELSE RETURN 'Bronze';
    END IF;
END //

DROP FUNCTION IF EXISTS fn_tempo_sessao //
CREATE FUNCTION fn_tempo_sessao (p_id_sessao INT) RETURNS VARCHAR(20) READS SQL DATA
BEGIN
    DECLARE v_inicio DATETIME;
    DECLARE v_fim DATETIME;
    DECLARE v_minutos_totais INT;
    DECLARE v_horas INT;
    DECLARE v_min_restantes INT;
    
    -- Ajuste Sênior: Se a sessão já foi fechada, usa o fim_sessao. Se não, usa NOW()
    SELECT inicio_sessao, IFNULL(fim_sessao, NOW()) INTO v_inicio, v_fim 
    FROM sessoes 
    WHERE id_sessao = p_id_sessao;
    
    SET v_minutos_totais = TIMESTAMPDIFF(MINUTE, v_inicio, v_fim);
    SET v_horas = FLOOR(v_minutos_totais / 60);
    SET v_min_restantes = v_minutos_totais MOD 60;
    
    RETURN CONCAT(v_horas, 'h ', v_min_restantes, 'min');
END //

DROP FUNCTION IF EXISTS fn_faturamento_dia //
CREATE FUNCTION fn_faturamento_dia (p_data DATE) RETURNS DECIMAL(10,2) READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(10,2);
    SELECT COALESCE(SUM(fn_valor_sessao(id_sessao)), 0) INTO v_total
    FROM sessoes
    WHERE status = 'Fechada' AND DATE(fim_sessao) = p_data;
    
    RETURN v_total;
END //

DROP PROCEDURE IF EXISTS sp_abrir_sessao //
CREATE PROCEDURE sp_abrir_sessao (
    IN p_id_cliente INT,
    IN p_id_computador INT,
    OUT p_id_sessao INT
)
BEGIN
    DECLARE v_erro BOOLEAN DEFAULT FALSE;
    DECLARE v_status_pc VARCHAR(20);
    DECLARE v_sessao_ativa INT DEFAULT 0;
    DECLARE v_prox_numero INT;
    
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET v_erro = TRUE;

    SELECT COUNT(*) INTO v_sessao_ativa FROM sessoes WHERE id_cliente = p_id_cliente AND status = 'Aberta';
    IF v_sessao_ativa > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Operação negada: O cliente já possui uma sessão ativa.';
    END IF;

    SELECT status INTO v_status_pc FROM computadores WHERE id_computador = p_id_computador;
    IF v_status_pc != 'Disponível' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Computador não está disponível';
    END IF;

    SELECT IFNULL(MAX(numero_sessao), 0) + 1 INTO v_prox_numero FROM sessoes;

    START TRANSACTION;
    INSERT INTO sessoes (numero_sessao, id_cliente, id_computador, inicio_sessao, valor_hora, status)
    VALUES (v_prox_numero, p_id_cliente, p_id_computador, NOW(), 15.00, 'Aberta');
    
    SET p_id_sessao = LAST_INSERT_ID();
    UPDATE computadores SET status = 'Em Uso' WHERE id_computador = p_id_computador;

    IF v_erro THEN ROLLBACK; ELSE COMMIT; END IF;
END //

DROP PROCEDURE IF EXISTS sp_fechar_sessao //
CREATE PROCEDURE sp_fechar_sessao (IN p_id_sessao INT)
BEGIN
    DECLARE v_erro BOOLEAN DEFAULT FALSE;
    DECLARE v_id_comp INT;
    
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET v_erro = TRUE;

    SELECT id_computador INTO v_id_comp
    FROM sessoes WHERE id_sessao = p_id_sessao AND status = 'Aberta';

    START TRANSACTION;
    UPDATE sessoes SET fim_sessao = NOW(), status = 'Fechada' WHERE id_sessao = p_id_sessao;
    UPDATE computadores SET status = 'Disponível' WHERE id_computador = v_id_comp;

    IF v_erro THEN ROLLBACK; ELSE COMMIT; END IF;
END //

DROP PROCEDURE IF EXISTS sp_registrar_consumo //
CREATE PROCEDURE sp_registrar_consumo (
    IN p_id_sessao INT,
    IN p_id_produto INT,
    IN p_quantidade INT
)
BEGIN
    DECLARE v_erro BOOLEAN DEFAULT FALSE;
    DECLARE v_estoque_atual INT;
    DECLARE v_preco DECIMAL(10,2);
    DECLARE v_id_cliente INT;
    DECLARE v_valor_total DECIMAL(10,2);
    
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET v_erro = TRUE;

    START TRANSACTION;

    -- Ajuste Sênior: FOR UPDATE trava a linha e impede furos de concorrência na mesma transação
    SELECT estoque, valor_produto INTO v_estoque_atual, v_preco 
    FROM produtos 
    WHERE id_produto = p_id_produto 
    FOR UPDATE;

    IF v_estoque_atual < p_quantidade THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Estoque insuficiente para a venda.';
    ELSE
        SELECT id_cliente INTO v_id_cliente FROM sessoes WHERE id_sessao = p_id_sessao;
        SET v_valor_total = p_quantidade * v_preco;

        UPDATE produtos SET estoque = estoque - p_quantidade WHERE id_produto = p_id_produto;
        
        INSERT INTO vendas (id_cliente, id_sessao, id_produto, quantidade, valor_total)
        VALUES (v_id_cliente, p_id_sessao, p_id_produto, p_quantidade, v_valor_total);

        IF v_erro THEN ROLLBACK; ELSE COMMIT; END IF;
    END IF;
END //

DROP PROCEDURE IF EXISTS sp_inscrever_torneio //
CREATE PROCEDURE sp_inscrever_torneio (
    IN p_id_cliente INT,
    IN p_id_torneio INT
)
BEGIN
    DECLARE v_erro BOOLEAN DEFAULT FALSE;
    DECLARE v_total_inscritos INT;
    DECLARE v_max_participantes INT;
    
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET v_erro = TRUE;

    SELECT max_participantes INTO v_max_participantes FROM torneios WHERE id_torneio = p_id_torneio;
    SELECT COUNT(*) INTO v_total_inscritos FROM inscricoes WHERE id_torneio = p_id_torneio;
    
    IF v_total_inscritos >= v_max_participantes THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Capacidade máxima do torneio atingida.';
    END IF;

    START TRANSACTION;
    INSERT INTO inscricoes (id_cliente, id_torneio, data_inscricao) VALUES (p_id_cliente, p_id_torneio, NOW());
    IF v_erro THEN ROLLBACK; ELSE COMMIT; END IF;
END //

DELIMITER ;


-- ????????????????????????????????????????????????????????????????????????????
--  2. VIEWS (Tabelas Virtuais para o Frontend)
-- ????????????????????????????????????????????????????????????????????????????

DROP VIEW IF EXISTS vw_sessoes_ativas;
CREATE VIEW vw_sessoes_ativas AS
SELECT 
    s.id_sessao, 
    c.nome AS cliente, 
    comp.numero_computador AS computador, 
    'PC Gamer' AS descricao_computador, 
    s.inicio_sessao AS inicio, 
    TIMESTAMPDIFF(MINUTE, s.inicio_sessao, NOW()) AS minutos_em_uso, 
    ROUND(GREATEST(TIMESTAMPDIFF(MINUTE, s.inicio_sessao, NOW()) / 60.0, 0.25) * s.valor_hora, 2) AS valor_parcial
FROM sessoes s
JOIN clientes c ON s.id_cliente = c.id_cliente
JOIN computadores comp ON s.id_computador = comp.id_computador
WHERE LOWER(s.status) = 'aberta';

DROP VIEW IF EXISTS vw_produtos_mais_vendidos;
CREATE VIEW vw_produtos_mais_vendidos AS
SELECT 
    p.nome_produto AS nome, 
    'Bomboniere' AS categoria, 
    SUM(v.quantidade) AS total_vendido, 
    SUM(v.valor_total) AS receita_total
FROM vendas v
JOIN produtos p ON v.id_produto = p.id_produto
GROUP BY p.id_produto
ORDER BY receita_total DESC;