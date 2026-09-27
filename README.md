# 15 anos da Samily

[![Acessar](https://img.shields.io/badge/Acessar-E97D98?style=for-the-badge&logo=githubpages&logoColor=white)](https://brigsd.github.io/festa-samily/)

Convite digital para a festa de 15 anos da Samily, com confirmação de presença sem criar conta ou fazer login.

## Como funciona

```text
Convidado → GitHub Pages → Google Apps Script → Google Sheets
```

- **GitHub Pages:** publica o front-end estático deste repositório (`index.html`, `style.css` e `app.js`).
- **Google Apps Script:** é a API pública usada pelo site. Ele entrega as informações da festa e grava as confirmações.
- **Google Sheets:** funciona como banco de dados e painel de administração das informações da festa e das confirmações.

O endereço da API fica configurado em `index.html`, no bloco `<script>` do `<head>` (`window.FESTA_API`), que também dispara a busca dos dados antes do restante do carregamento. O código do Apps Script e a planilha não ficam neste repositório.

## Para os convidados

O convidado abre o link do convite e pode confirmar ou recusar presença, informando somente a quantidade de pessoas.

Não há login. Depois de responder, o site guarda um token no navegador do convidado. Esse token permite atualizar a resposta pelo mesmo navegador, sem expor a edição da planilha.

## Planilha

O Apps Script usa duas abas:

| Aba | Finalidade |
| --- | --- |
| `Evento` | Informações da festa exibidas no convite. |
| `Confirmacoes` | Registro das respostas de presença. |

### Aba `Evento`

Tem as colunas `chave` e `valor`, uma informação por linha:

| Chave | Uso |
| --- | --- |
| `titulo` | Nome do evento usado no Google Agenda. |
| `data` | Data e horário da festa (célula no formato de data). |
| `endereco` | Local exibido no convite e usado no botão de copiar e no Google Agenda. |
| `observacoes` | Texto livre para os convidados. |

### Aba `Confirmacoes`

Preenchida pelo Apps Script com `token`, `resposta` (`sim` ou `nao`), `quantidade`, `criadoEm` e `atualizadoEm`.

## Configuração inicial

1. Crie a planilha no Google Sheets e abra **Extensões > Apps Script**.
2. Cole o código da API e execute a função `prepararPlanilha` uma vez para criar as abas.
3. Preencha a aba `Evento`.
4. Publique em **Implantar > Nova implantação > App da Web**, executando como você e com acesso para **Qualquer pessoa**.
5. Copie a URL terminada em `/exec` e cole em `window.FESTA_API`, no `index.html`.
6. Em **Settings > Pages** deste repositório, publique a partir da branch `main`.

Ao alterar o código do Apps Script, edite a implantação existente e publique uma nova versão para manter a mesma URL.

## Atualizando o convite

- **Dados da festa:** altere a aba `Evento` na planilha. O site consulta as informações ao abrir ou atualizar a página.
- **Visual e textos do site:** edite os arquivos deste repositório e envie as mudanças para `main`.

O GitHub Pages publica automaticamente os commits enviados para `main`.

## Privacidade e segurança

- Mantenha a planilha como **Restrita** e conceda edição somente às pessoas responsáveis pela organização.
- Não inclua no repositório o link de edição da planilha, credenciais ou o código privado do Apps Script.
- O arquivo `.env.local` é ignorado pelo Git e pode ser usado apenas como anotação local; o front-end não deve depender dele, pois qualquer configuração enviada ao navegador fica pública.

## Rodando localmente

Abra a pasta do projeto em um servidor local. Por exemplo, com Python instalado:

```bash
python -m http.server 4173
```

Depois acesse `http://127.0.0.1:4173/`.
