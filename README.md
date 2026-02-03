# ⚡ LightLoad Pro

Sistema profissional de cálculo de consumo de energia para equipamentos de iluminação e eventos.

## 🎯 Funcionalidades

- ✅ **Gerenciamento de Equipamentos**: Cadastro completo com marca, modelo, potência e categoria
- ✅ **Cálculos Simples**: Cálculo rápido de consumo total
- ✅ **Distribuição de Circuitos**: Organização por portas/disjuntores com alertas de sobrecarga
- ✅ **Alertas Inteligentes**: Avisos automáticos de sobrecarga, incompatibilidade de voltagem
- ✅ **Geração de PDFs**: Relatórios profissionais com logo e assinatura
- ✅ **Banco de Dados em Nuvem**: Persistência via Supabase
- ✅ **Modo Offline**: Funciona sem internet usando localStorage
- ✅ **PWA**: Instalável como aplicativo nativo

## 🚀 Tecnologias

- **React 19** + **TypeScript**
- **Vite** - Build tool ultra-rápido
- **Supabase** - Banco de dados PostgreSQL em nuvem
- **jsPDF** - Geração de relatórios PDF
- **Lucide React** - Ícones modernos
- **Service Worker** - Funcionalidade offline

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta Supabase (grátis em https://supabase.com)

## ⚙️ Instalação

1. **Clone o repositório:**
```bash
git clone https://github.com/SEU_USUARIO/lightload-pro.git
cd lightload-pro
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure as variáveis de ambiente:**
```bash
cp .env.example .env.local
```

Edite `.env.local` e adicione suas credenciais:
- `NEXT_PUBLIC_SUPABASE_URL`: URL do seu projeto Supabase
- `NEXT_PUBLIC_SUPABASE_KEY`: Chave anon do seu projeto
- `GEMINI_API_KEY`: (Opcional) Para funcionalidades de IA

4. **Configure o banco de dados Supabase:**

Execute os seguintes comandos SQL no SQL Editor do Supabase:

```sql
-- Tabela de equipamentos
CREATE TABLE equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  category TEXT,
  watts NUMERIC NOT NULL,
  voltage TEXT,
  amperes NUMERIC,
  power_factor NUMERIC DEFAULT 1.0,
  quantity_owned NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de cálculos/relatórios
CREATE TABLE calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  technical_responsible TEXT,
  voltage_system NUMERIC,
  total_watts NUMERIC,
  total_amperes NUMERIC,
  items JSONB,
  ports JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas (ajuste conforme necessário)
CREATE POLICY "Enable all for equipments" ON equipments FOR ALL USING (true);
CREATE POLICY "Enable all for calculations" ON calculations FOR ALL USING (true);

-- Índices para performance
CREATE INDEX idx_equipments_category ON equipments(category);
CREATE INDEX idx_calculations_type ON calculations(type);
CREATE INDEX idx_calculations_created ON calculations(created_at DESC);
```

5. **Inicie o servidor de desenvolvimento:**
```bash
npm run dev
```

Acesse http://localhost:3000

## 📦 Build para Produção

```bash
npm run build
npm run preview
```

## 🌐 Deploy

O projeto pode ser hospedado em:
- **Vercel** (recomendado)
- **Netlify**
- **GitHub Pages**
- Qualquer servidor estático

## 📱 Acesso em Rede Local

O servidor roda em `0.0.0.0:3000`, permitindo acesso de outros dispositivos na mesma rede WiFi via IP local (ex: `http://192.168.x.x:3000`).

## 🔒 Segurança

- ⚠️ **NUNCA** commite o arquivo `.env.local`
- As credenciais Supabase são apenas para leitura pública
- Configure RLS (Row Level Security) no Supabase para produção

## 📄 Licença

MIT

---

Desenvolvido com ⚡ por Farias Light
