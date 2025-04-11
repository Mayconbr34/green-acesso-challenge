# Green Acesso Challenge

API para importação e exportação de boletos do Green Acesso Challenge.

## Descrição

Este projeto é uma solução para o desafio técnico da Green Acesso. A aplicação permite:

- Importar boletos de um arquivo CSV (uploads/csv)
- Processar um arquivo PDF contendo múltiplos boletos (uploads/pdf)
- Consultar boletos com filtros
- Gerar relatórios em PDF
- Gerenciar lotes e mapeamentos entre sistemas

## Tecnologias Utilizadas

- Node.js
- Express.js
- Sequelize ORM
- MySQL
- JWT para autenticação
- Multer para upload de arquivos
- PDF-lib e PDFKit para manipulação de PDFs
- CSV-parser para processamento de arquivos CSV

## Pré-requisitos

- Node.js (v14+)
- MySQL (v5.7+)
- Yarn ou NPM

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/Mayconbr34/green-acesso-challenge.git
cd green-acesso-challenge
```

2. Instale as dependências:
```bash
npm install
# ou
yarn install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

4. Execute o script SQL para criar o banco de dados:
```bash
mysql -u seu_usuario -p < database.sql
```

5. Certifique-se de que as pastas necessárias existam e tenham permissões adequadas:
```bash
mkdir -p uploads/csv uploads/pdf output/boletos
```

6. Inicie o servidor:
```bash
npm start
# ou
yarn start
```

## Estrutura do Projeto

```
green-acesso-challenge/
├── src/                  # Código fonte
│   ├── config/           # Configurações
│   ├── controllers/      # Controladores
│   ├── database/         # Modelos do banco de dados
│   ├── middlewares/      # Middlewares
│   ├── routes/           # Rotas da API
│   └── services/         # Serviços
├── uploads/              # Arquivos enviados
├── output/               # Arquivos gerados
├── .env.example          # Exemplo de variáveis de ambiente
├── database.sql          # Script SQL
└── README.md             # Documentação
```

## Endpoints da API

### Autenticação

- `POST /api/auth/login` - Login de usuário
- `GET /api/auth/me` - Informações do usuário autenticado
- `POST /api/auth/register` - Registro de novo usuário (admin)

### Boletos

- `GET /api/boletos` - Listar boletos (com filtros)
- `GET /api/boletos?relatorio=1` - Gerar relatório PDF
- `GET /api/boletos/:id` - Buscar boleto específico
- `GET /api/boletos/:id/pdf` - Baixar PDF do boleto
- `POST /api/boletos/importar-csv` - Importar boletos de CSV
- `POST /api/boletos/processar-pdf` - Processar arquivo PDF
- `GET /api/boletos/estatisticas` - Obter estatísticas dos boletos

### Lotes

- `GET /api/lotes` - Listar lotes
- `POST /api/lotes` - Criar lote
- `GET /api/lotes/mapeamentos` - Listar mapeamentos
- `POST /api/lotes/mapeamentos` - Criar mapeamento

## Autenticação

A API utiliza autenticação JWT. Para acessar endpoints protegidos, inclua o token no cabeçalho:

```
Authorization: Bearer seu_token_jwt
```

O token é obtido através do endpoint de login.

## Importando Boletos

### Via CSV

Para importar boletos, envie um arquivo CSV com os campos:
- nome
- unidade
- valor
- linha_digitavel

Exemplo:
```
nome;unidade;valor;linha_digitavel
JOSE DA SILVA;17;182.54;123456123456123456
```

### Via PDF

Envie um arquivo PDF contendo múltiplas páginas, cada uma representando um boleto. As páginas serão associadas aos boletos existentes no banco de dados, seguindo a ordem dos IDs (uploads/pdf).

**Importante**: Para processar um PDF, você precisa primeiro importar os boletos via CSV. O número de páginas do PDF deve corresponder ao número de boletos no banco de dados.

## Gerando Coleção do Postman

Para usar a coleção do Postman:

1. Abra o Postman
2. Clique no botão "Import"
3. Escolha a opção "Link" e insira: https://www.postman.com/technical-astronaut-76829111/green-acesso-challenge/collection/kceovy1/green-acesso-challenge
4. Ou importe o arquivo `Green_Acesso_Challenge.postman_collection.json` fornecido na raiz do projeto

## Usuário padrão

Um usuário administrador já vem configurado no banco de dados:

- Email: `admin@greenacesso.com`
- Senha: `senha123`

Use estas credenciais para fazer o primeiro login e acessar as funcionalidades da API.