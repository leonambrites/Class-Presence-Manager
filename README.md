# Class Presence Manager 🏫

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#)
[![Vercel Deployment](https://img.shields.io/badge/deployed_to-Vercel-black?logo=vercel)](#)

O **Class Presence Manager** é uma solução SaaS moderna, responsiva e de alta performance projetada para centralizar e otimizar a gestão de presença de alunos, escalas de líderes/voluntários e a distribuição de materiais didáticos (aulas) em tempo real.

Projetado sob os pilares de design limpo e interfaces fluidas inspiradas no padrão estético de 2025 (como Linear, Stripe e Vercel), este sistema é ideal para igrejas, escolas, ONGs e outras instituições que necessitam de um controle dinâmico e seguro sobre suas turmas e equipes.

---

## 📌 Sumário

1. [Funcionalidades Principais](#-funcionalidades-principais)
2. [Tecnologias Utilizadas](#-tecnologias-utilizadas)
3. [Pré-requisitos](#-pré-requisitos)
4. [Instruções para Execução Local](#-instruções-para-execução-local)
5. [Guia de Configuração das Credenciais (Passo a Passo)](#-guia-de-configuração-das-credenciais-passo-a-passo)
   - [Clerk (Autenticação)](#clerk-autenticação)
   - [Neon (Banco de Dados PostgreSQL)](#neon-banco-de-dados-postgresql)
   - [Vercel Blob (Armazenamento de Arquivos)](#vercel-blob-armazenamento-de-arquivos)
   - [Google Sheets API (Sincronização)](#google-sheets-api-sincronização)
6. [Execução de Testes](#-execução-de-testes)
7. [Instruções para Implantação (Vercel)](#-instruções-para-implantação-vercel)
8. [Como Contribuir](#-como-contribuir)
9. [Licença](#-licença)

---

## 🌟 Funcionalidades Principais

*   **Gestão de Alunos**: Fichas organizadas por faixa etária/classe (Maternal, 2-3 anos, 4-5 anos, etc.), identificando o tipo de aluno (Membro/Visitante), contatos dos responsáveis e alertas de saúde (alergias com descrições visíveis).
*   **Presença em Tempo Real**: Controle prático de entrada/saída (check-in/check-out) com atualização em tempo real, contadores de alunos presentes por turma e histórico integrado.
*   **Escala de Voluntários (Equipe)**: Planejamento mensal da equipe de líderes e voluntários por turma e data, facilitando a distribuição e reduzindo a carga cognitiva na organização das turmas.
*   **Central de Aulas e Materiais**: Espaço para download e upload seguro de roteiros de aulas e materiais didáticos (como arquivos do Microsoft Word e PDFs). Integra-se com o Vercel Blob de acesso privado, garantindo que os arquivos só possam ser acessados por usuários autenticados.
*   **Sincronização com Google Sheets**: Sincronização automática em segundo plano para ler/escrever dados em planilhas Google de forma transparente.

---

## 💻 Tecnologias Utilizadas

O ecossistema do projeto foi construído utilizando tecnologias modernas de desenvolvimento web de ponta:

| Tecnologia | Descrição |
| :--- | :--- |
| **React 18** | Biblioteca base para construção da interface de usuário reativa. |
| **TypeScript** | Tipagem estática para robustez e redução de bugs em tempo de compilação. |
| **Tailwind CSS** | Framework utilitário de CSS para design system moderno, fluido e responsivo. |
| **Parcel Bundler** | Empacotador web rápido e sem configurações complexas para o frontend. |
| **Node.js & Express** | API RESTful flexível rodando como backend. |
| **Neon PostgreSQL** | Banco de dados relacional Serverless na nuvem de alta escalabilidade. |
| **Clerk Auth** | Autenticação segura de usuários e proteção de rotas privadas. |
| **Vercel Blob** | Armazenamento de arquivos estáticos privado para os materiais de aulas. |
| **Google APIs (Sheets)** | Integração e sincronização bidirecional de planilhas. |

---

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em sua máquina:
*   [Node.js](https://nodejs.org) (Versão 18.x ou superior recomendada)
*   Gerenciador de pacotes `npm` (incluso com o Node.js)

---

## 🚀 Instruções para Execução Local

Siga o passo a passo abaixo para rodar o projeto localmente:

### 1. Clonar o Repositório
```bash
git clone https://github.com/leonambrites/Class-Presence-Manager.git
cd Class-Presence-Manager
```

### 2. Instalar as Dependências
Instale todos os pacotes necessários do frontend e backend:
```bash
npm install
```

### 3. Configurar as Variáveis de Ambiente
Crie um arquivo chamado `.env` na raiz do projeto (com base no modelo de `.env.example`) com as seguintes chaves:
```env
# 🐘 Neon PostgreSQL Database URL
DATABASE_URL="postgresql://usuario:senha@host-neon.neon.tech/neondb?sslmode=require"

# 🔑 Clerk Authentication Keys
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# 📦 Vercel Blob Storage Token
BLOB_READ_WRITE_TOKEN="prj_..."

# 📊 Google Sheets Sync
SPREADSHEET_ID="123456abcdef..."
GOOGLE_SERVICE_ACCOUNT_EMAIL="sua-conta-de-servico@seu-projeto.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQ...\n-----END PRIVATE KEY-----\n"
```

### 4. Executar os Servidores de Desenvolvimento
O projeto está configurado para rodar simultaneamente o backend Express (porta `3000`) e o frontend Parcel (porta `1234` ou similar com proxy automático para `/api`) usando o utilitário `concurrently`:

```bash
npm run start
```

Se preferir rodar os serviços separadamente, execute:
*   **Apenas Backend (API)**: `npm run start:api`
*   **Apenas Frontend (Web)**: `npm run start:web`

---

## 🔑 Guia de Configuração das Credenciais (Passo a Passo)

### Clerk (Autenticação)
1. Acesse o console do [Clerk](https://clerk.com) e crie um novo aplicativo.
2. Na barra lateral, selecione **API Keys**.
3. Copie o valor de **Publishable key** e configure como `VITE_CLERK_PUBLISHABLE_KEY`.
4. Copie o valor de **Secret key** e configure como `CLERK_SECRET_KEY`.

### Neon (Banco de Dados PostgreSQL)
1. Crie uma conta ou faça login no [Neon Console](https://neon.tech).
2. Crie um novo projeto/banco de dados PostgreSQL.
3. No painel principal (Dashboard), localize a seção **Connection Details** e copie a string de conexão configurada para `.env`.
4. Defina como `DATABASE_URL`.
> [!NOTE]
> Você não precisa executar scripts manuais para criar as tabelas do banco de dados relacional. Na primeira vez que a API backend for iniciada localmente ou em produção, o script de inicialização `api/database.ts` detectará a ausência das tabelas e as criará de forma totalmente automática.

### Vercel Blob (Armazenamento de Arquivos)
1. Acesse sua conta na [Vercel](https://vercel.com) e vincule seu projeto.
2. Vá para a aba **Storage** no menu superior do dashboard da Vercel.
3. Selecione **Blob** e crie um novo container de arquivos.
4. Vá para as configurações do container e copie a chave `BLOB_READ_WRITE_TOKEN`.
5. Cole no arquivo `.env`. Os uploads e downloads serão controlados por tokens gerados em tempo real na API com acesso privado.

### Google Sheets API (Sincronização)
1. Vá até o [Google Cloud Console](https://console.cloud.google.com).
2. Crie um novo projeto (ex: *Class Presence Sync*).
3. Vá em **APIs e Serviços** > **Biblioteca**, busque por **Google Sheets API** e clique em **Ativar**.
4. Acesse **APIs e Serviços** > **Credenciais**, clique em **Criar Credenciais** e selecione **Conta de Serviço**.
5. Conclua a criação da conta de serviço. Em seguida, clique sobre o email da conta criada na listagem.
6. Vá na aba **Chaves** (Keys), clique em **Adicionar Chave** > **Criar Nova Chave** e escolha o formato **JSON**.
7. O download de um arquivo JSON será feito automaticamente. Abra este arquivo:
   *   O valor de `"client_email"` é o seu `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
   *   O valor de `"private_key"` é o seu `GOOGLE_SERVICE_ACCOUNT_KEY`. Certifique-se de que a string no `.env` possua as quebras de linha representadas por `\n` ou cole o bloco completo exatamente como exportado.
8. Crie a planilha que deseja utilizar no Google Sheets. Copie o ID da planilha contido na URL:
   *   `https://docs.google.com/spreadsheets/d/ID_AQUI_DA_PLANILHA/edit` -> configure como `SPREADSHEET_ID`.
9. **Importante**: Entre na planilha do Google Sheets, clique em **Compartilhar** no canto superior direito e adicione o email da Conta de Serviço (`client_email`) como **Editor**.

---

## 🧪 Execução de Testes e Scripts

### Scripts Utilitários
A pasta `scripts` contém códigos utilitários TypeScript que podem ser rodados para importações em massa e verificações de integridade. Para rodá-los, utilize o `tsx`:

*   **Verificar dados básicos (Alunos)**:
    ```bash
    npx tsx scripts/check.ts
    ```
*   **Importar alunos a partir de CSV**:
    ```bash
    npx tsx scripts/import_csv.ts
    ```
*   **Importar escala de voluntários a partir de CSV**:
    ```bash
    npx tsx scripts/import_schedule.ts
    ```
*   **Limpar banco de dados (Cuidado!)**:
    ```bash
    npx tsx scripts/wipe_database.ts
    ```

### Testes Automatizados
Atualmente, o projeto utiliza testes manuais guiados e scripts utilitários de consistência. Se desejar adicionar testes automatizados no futuro, é recomendado:
1. Instalar o **Vitest** ou **Jest** para testes de unidade no backend e frontend.
2. Adicionar o script `"test": "vitest"` no seu `package.json`.
3. Executar com `npm run test`.

---

## 📦 Instruções para Implantação (Vercel)

Este repositório está pré-configurado para implantação na **Vercel** usando as configurações de `vercel.json`:

1. Conecte seu repositório GitHub ao painel da Vercel.
2. Nas configurações do projeto (Project Settings), acesse a aba **Environment Variables**.
3. Adicione todas as variáveis de ambiente descritas na seção local.
4. Clique em **Deploy**.
5. O Vercel detectará o arquivo `vercel.json` e configurará as funções serverless para as rotas `/api/*` apontando diretamente para `api/index.ts` e servirá o frontend compilado na raiz.

---

## 🤝 Como Contribuir

Contribuições de melhorias, correções de bugs e novas funcionalidades são sempre bem-vindas!

1. Faça um **Fork** do projeto.
2. Crie uma branch para sua modificação:
   ```bash
   git checkout -b feature/minha-melhoria
   ```
3. Realize os commits seguindo a convenção do [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat: adiciona componente de auditoria de presença"
   ```
4. Envie as alterações para sua branch remota:
   ```bash
   git push origin feature/minha-melhoria
   ```
5. Abra um **Pull Request** detalhando as alterações propostas.

---

## 📄 Licença

Este projeto é distribuído sob a licença **MIT**.
