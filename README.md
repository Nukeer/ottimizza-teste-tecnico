# Kanban Board - Ottimizza

Aplicação de quadro Kanban desenvolvida com Angular 20.

## Pré-requisitos

- Node.js (versão 18 ou superior)
- npm
- Backend API rodando em `http://localhost:8080/api/v1/`

## Instalação

```bash
npm install
```

## Development server

To start a local development server, run:

```bash
npm run start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Estrutura do Projeto

```
src/app/
├── pages/
│   ├── board-list/          # Página de listagem de quadros
│   └── kanban-board/        # Página do quadro Kanban
├── shared/
│   ├── components/          # Componentes (Coluna Kanban, Card da Tarefa)
│   ├── models/              # Interfaces (Board, Column, Task)
│   └── services/            # Services HTTP (BoardService, ColumnService, TaskService)
└── app.routes.ts            # Configuração de rotas
```

## Tecnologias Utilizadas

- Angular 20.3
- TypeScript 5.9
- PrimeNG 20.4
- PrimeIcons 7
- SCSS
- RxJS 7.8
- Angular Signals
- Standalone Components

## Adicional
- Foi criado um arquivo proxy.conf para não ter problema com CORS do backend, necessario rodar com ele, os endpoints estao sendo utilizados pelo proxy.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

