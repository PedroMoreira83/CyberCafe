CREATE DATABASE IF NOT EXISTS arena_gamer;
USE arena_gamer;

CREATE TABLE clientes (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20),
    saldo DECIMAL(10,2) DEFAULT 0.00
);

CREATE TABLE computadores (
    id_computador INT AUTO_INCREMENT PRIMARY KEY,
    numero_computador INT UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'Disponível' 
);

CREATE TABLE sessoes (
    id_sessao INT AUTO_INCREMENT PRIMARY KEY,
    numero_sessao INT NOT NULL,
    id_cliente INT NOT NULL,
    id_computador INT NOT NULL,
    inicio_sessao DATETIME NOT NULL,
    fim_sessao DATETIME,
    valor_hora DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Aberta', 
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
    FOREIGN KEY (id_computador) REFERENCES computadores(id_computador)
);

CREATE TABLE produtos (
    id_produto INT AUTO_INCREMENT PRIMARY KEY,
    nome_produto VARCHAR(100) NOT NULL,
    valor_produto DECIMAL(10,2) NOT NULL,
    estoque INT DEFAULT 0
);

CREATE TABLE vendas (
    id_venda INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL, 
    id_sessao INT,  -- AQUI: Removido o NOT NULL para permitir venda avulsa
    id_produto INT NOT NULL,
    quantidade INT NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    data_venda DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
    FOREIGN KEY (id_sessao) REFERENCES sessoes(id_sessao),
    FOREIGN KEY (id_produto) REFERENCES produtos(id_produto)
);

CREATE TABLE auditoria_caixa (
    id_log INT AUTO_INCREMENT PRIMARY KEY,
    tabela_afetada VARCHAR(50) NOT NULL,
    operacao VARCHAR(50) NOT NULL, 
    data_log DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario VARCHAR(50) DEFAULT 'sistema',
    descricao VARCHAR(255) NOT NULL
);