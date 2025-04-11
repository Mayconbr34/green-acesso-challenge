-- Criação do banco de dados
CREATE DATABASE IF NOT EXISTS green_acesso_challenge;

USE green_acesso_challenge;

-- Tabela de usuários para autenticação
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de lotes do condomínio
CREATE TABLE IF NOT EXISTS lotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de boletos
CREATE TABLE IF NOT EXISTS boletos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome_sacado VARCHAR(255) NOT NULL,
  id_lote INT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  linha_digitavel VARCHAR(255) NOT NULL,
  pdf_path VARCHAR(255),
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_lote) REFERENCES lotes(id)
);

-- Tabela para mapear unidades externas com lotes internos
CREATE TABLE IF NOT EXISTS mapeamento_lotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome_externo VARCHAR(100) NOT NULL,
  id_lote_interno INT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_lote_interno) REFERENCES lotes(id),
  UNIQUE KEY (nome_externo)
);

-- Inserir usuário administrador inicial
INSERT INTO users (nome, email, senha, role) VALUES 
('Admin', 'admin@greenacesso.com', '$2a$10$fGOTd/8aXs4wQ4VcXi66OOGfyRBiH6ooOiciO6BgnKyssPLWqrKgW', 'admin');
-- Senha: senha123 (já armazenada com hash bcrypt)

-- Inserir lotes de exemplo
INSERT INTO lotes (nome) VALUES 
('0017'),
('0018'),
('0019');

-- Inserir mapeamento de lotes de exemplo
INSERT INTO mapeamento_lotes (nome_externo, id_lote_interno) VALUES 
('17', 1),
('18', 2),
('19', 3);