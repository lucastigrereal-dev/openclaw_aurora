/**
 * Hub Enterprise - Template Manager
 * Gerencia templates de código para diferentes stacks
 */

export interface CodeTemplate {
  name: string;
  category: 'backend' | 'frontend' | 'data' | 'infrastructure';
  tech: string[];
  description: string;
  files: TemplateFile[];
  dependencies?: string[];
  devDependencies?: string[];
  scripts?: Record<string, string>;
}

export interface TemplateFile {
  path: string;
  content: string;
  isTemplate: boolean; // true se tem {{variables}} que devem ser substituídas
}

const REST_API_EXPRESS: CodeTemplate = {
  name: 'rest-api-express',
  category: 'backend',
  tech: ['Node.js', 'Express', 'TypeScript', 'PostgreSQL', 'Prisma'],
  description: 'REST API com Express, TypeScript e Prisma ORM',
  files: [
    {
      path: 'src/server.ts',
      content: `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
const server = createServer(app);

server.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

export default app;
`,
      isTemplate: false,
    },
    {
      path: 'package.json',
      content: `{
  "name": "{{appName}}",
  "version": "1.0.0",
  "description": "{{appDescription}}",
  "main": "dist/server.js",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "@prisma/client": "^5.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "tsx": "^3.12.0",
    "vitest": "^0.34.0",
    "eslint": "^8.40.0"
  }
}
`,
      isTemplate: true,
    },
    {
      path: 'Dockerfile',
      content: `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

EXPOSE 3000

CMD ["node", "dist/server.js"]
`,
      isTemplate: false,
    },
    {
      path: 'docker-compose.yml',
      content: `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/{{appName}}
      - NODE_ENV=production
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: {{appName}}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
`,
      isTemplate: true,
    },
    {
      path: '.github/workflows/ci.yml',
      content: `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm ci
      - run: npm run build
      - run: npm test

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm ci
      - run: npm run lint
`,
      isTemplate: false,
    },
  ],
  dependencies: ['express', 'cors', 'helmet', '@prisma/client'],
  devDependencies: [
    '@types/express',
    '@types/node',
    'typescript',
    'tsx',
    'vitest',
    'eslint',
  ],
  scripts: {
    dev: 'tsx watch src/server.ts',
    build: 'tsc',
    start: 'node dist/server.js',
    test: 'vitest',
    lint: 'eslint src --ext .ts',
  },
};

const GRAPHQL_APOLLO: CodeTemplate = {
  name: 'graphql-apollo',
  category: 'backend',
  tech: ['Node.js', 'Apollo Server', 'TypeScript', 'PostgreSQL', 'Prisma'],
  description: 'GraphQL API com Apollo Server e Prisma',
  files: [
    {
      path: 'src/server.ts',
      content: `import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: parseInt(process.env.PORT || '4000', 10) },
});

console.log(\`🚀 Server ready at: \${url}\`);
`,
      isTemplate: false,
    },
  ],
  dependencies: ['@apollo/server', '@apollo/client', '@prisma/client'],
  devDependencies: ['@types/node', 'typescript', 'vitest'],
};

const REACT_SPA: CodeTemplate = {
  name: 'react-spa',
  category: 'frontend',
  tech: ['React', 'Vite', 'TypeScript', 'TailwindCSS', 'React Router'],
  description: 'Single Page Application com React e Vite',
  files: [
    {
      path: 'src/App.tsx',
      content: `import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
`,
      isTemplate: false,
    },
  ],
  dependencies: ['react', 'react-dom', 'react-router-dom'],
  devDependencies: ['vite', '@vitejs/plugin-react', 'typescript', 'tailwindcss'],
};

const NEXTJS_APP: CodeTemplate = {
  name: 'nextjs-app',
  category: 'frontend',
  tech: ['Next.js', 'TypeScript', 'TailwindCSS', 'React'],
  description: 'Next.js App com SSR/SSG',
  files: [
    {
      path: 'app/page.tsx',
      content: `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">Welcome</h1>
    </main>
  );
}
`,
      isTemplate: false,
    },
  ],
  dependencies: ['next', 'react', 'react-dom'],
  devDependencies: ['typescript', 'tailwindcss'],
};

const POSTGRESQL_TEMPLATE: CodeTemplate = {
  name: 'postgresql',
  category: 'data',
  tech: ['PostgreSQL', 'Prisma'],
  description: 'PostgreSQL com Prisma ORM',
  files: [
    {
      path: 'prisma/schema.prisma',
      content: `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id    Int     @id @default(autoincrement())
  title String
  content String?
  authorId Int
  author User @relation(fields: [authorId], references: [id])
}
`,
      isTemplate: false,
    },
  ],
};

const templateRegistry: Record<string, CodeTemplate> = {
  'rest-api-express': REST_API_EXPRESS,
  'graphql-apollo': GRAPHQL_APOLLO,
  'react-spa': REACT_SPA,
  'nextjs-app': NEXTJS_APP,
  postgresql: POSTGRESQL_TEMPLATE,
};

export function getTemplate(name: string): CodeTemplate | undefined {
  return templateRegistry[name];
}

export function listTemplates(): CodeTemplate[] {
  return Object.values(templateRegistry);
}

export function listTemplatesByCategory(
  category: CodeTemplate['category']
): CodeTemplate[] {
  return Object.values(templateRegistry).filter((t) => t.category === category);
}

export function registerTemplate(template: CodeTemplate) {
  templateRegistry[template.name] = template;
}

export default templateRegistry;
