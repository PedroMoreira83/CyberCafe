USE arena_gamer;

INSERT INTO clientes (cpf, nome, telefone, saldo) VALUES
('11122233344', 'Ana Clara Silva', '81999998888', 50.00),
('55566677788', 'Pedro Gomes', '81977776666', 15.50),
('99900011122', 'Lucas Santos', '81955554444', 0.00),
('33344455566', 'Beatriz Costa', '81933332222', 100.00),
('12312312312', 'Carlos Eduardo', '81912341234', 10.00),
('23423423423', 'Mariana Oliveira', '81923452345', 25.00),
('34534534534', 'Fernanda Lima', '81934563456', 0.00),
('45645645645', 'Rafael Souza', '81945674567', 150.00),
('56756756756', 'João Almeida', '81956785678', 5.00),
('67867867867', 'Juliana Mendes', '81967896789', 45.00),
('78978978978', 'Diego Martins', '81978907890', 12.00),
('89089089089', 'Camila Rocha', '81989018901', 0.00),
('09809809809', 'Thiago Barbosa', '81909870987', 30.00),
('87687687687', 'Letícia Ribeiro', '81987658765', 80.00),
('76576576576', 'Gabriel Carvalho', '81976547654', 20.00);

INSERT INTO computadores (numero_computador, status) VALUES
(1, 'Disponível'),
(2, 'Disponível'),
(3, 'Manutenção'),
(4, 'Disponível'),
(5, 'Disponível'),
(6, 'Em Uso'),
(7, 'Disponível'),
(8, 'Manutenção'),
(9, 'Disponível'),
(10, 'Disponível'),
(11, 'Em Uso'),
(12, 'Disponível'),
(13, 'Disponível'),
(14, 'Manutenção'),
(15, 'Disponível');

INSERT INTO produtos (nome_produto, valor_produto, estoque) VALUES
('Refrigerante Cola 350ml', 5.00, 50),
('Salgadinho Doritos', 8.50, 30),
('Bala Halls', 2.00, 100),
('Energético Red Bull', 12.00, 20),
('Água Mineral 500ml', 3.00, 40),
('Refrigerante Guaraná 350ml', 5.00, 45),
('Batata Pringles', 14.90, 15),
('Energético Monster', 11.50, 25),
('Chocolate Snickers', 4.50, 60),
('Chocolate Twix', 4.50, 60),
('Bala Fini Dentadura', 6.00, 35),
('Bala Fini Minhoca', 6.00, 35),
('Salgadinho Ruffles', 9.00, 25),
('Suco de Uva Lata', 6.50, 20),
('Biscoito Oreo', 5.50, 40);

INSERT INTO sessoes (numero_sessao, id_cliente, id_computador, inicio_sessao, fim_sessao, valor_hora, status) VALUES
(1, 1, 1, '2026-05-29 14:00:00', '2026-05-29 16:00:00', 10.00, 'Fechada'),
(2, 2, 2, '2026-05-29 15:30:00', '2026-05-29 16:30:00', 10.00, 'Fechada'),
(3, 4, 4, '2026-05-29 18:00:00', '2026-05-29 21:00:00', 10.00, 'Fechada');

INSERT INTO vendas (id_cliente, id_sessao, id_produto, quantidade, valor_total, data_venda) VALUES
(1, 1, 1, 2, 10.00, '2026-05-29 14:30:00'), 
(1, 1, 2, 1, 8.50, '2026-05-29 15:00:00');  

INSERT INTO vendas (id_cliente, id_sessao, id_produto, quantidade, valor_total, data_venda) VALUES
(2, 2, 4, 1, 12.00, '2026-05-29 16:00:00'); 

INSERT INTO vendas (id_cliente, id_sessao, id_produto, quantidade, valor_total, data_venda) VALUES
(4, 3, 5, 1, 3.00, '2026-05-29 18:45:00'),
(4, 3, 3, 2, 4.00, '2026-05-29 20:15:00');