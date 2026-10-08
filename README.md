# Gasoline

Aplicação privada para um pequeno grupo acompanhar preços de combustíveis e decidir onde abastecer. A interface prioriza preço, distância aproximada e data da atualização no celular.

## Stack e arquitetura

- Next.js 16 App Router, React 19, TypeScript e Tailwind CSS 4; hospedagem preparada para Vercel. Leaflet renderiza o mapa no cliente com tiles do OpenStreetMap.
- Supabase Auth, PostgreSQL com RLS e Storage privado. O navegador usa apenas a chave **publishable**. Não há service role no código.
- Gemini: leitura de preços pelo SDK oficial `@google/genai`, usando a [Interactions API recomendada pelo Google](https://ai.google.dev/gemini-api/docs/migrate-to-interactions), com JSON estruturado e `store: false`.
- OpenRouteService: Directions GeoJSON `driving-car` pelo servidor Next.js. A navegação externa usa [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started), sem chave do Google Maps.
- `src/app`: páginas, endpoints autenticados, proteção de sessão e manifest PWA. `src/components`: interface e formulários. `src/lib`: acesso a dados, geolocalização, preço, validação de fotos e adaptadores Gemini/ORS.
- `supabase/migrations`: esquema versionado, grants e políticas. `supabase/seed.sql`: postos fictícios exclusivos do ambiente local.

## Configuração local

1. Instale Node.js 22 ou superior, Docker Desktop e Supabase CLI.
2. `npm ci`
3. `npx supabase start` e `npx supabase db reset` para aplicar a migration e o seed local. O Docker deve estar em execução.
4. Copie `.env.example` para `.env.local`. Preencha as variáveis Supabase com os valores de `npx supabase status` ou do painel do projeto. Configure Gemini/ORS se quiser testar chamadas reais; sem essas chaves, o app mantém digitação manual e navegação externa.
5. `npm run dev` e abra `http://localhost:3000`.

O seed cria seis postos fictícios perto de Cuiabá. Após criar um usuário local, execute `supabase/seed.sql` novamente no SQL Editor local para adicionar histórico de 90 dias dos quatro combustíveis. O seed não é aplicado em produção por `supabase db push`; cadastre os postos reais manualmente no SQL Editor ou em uma migration própria.

## Supabase hospedado

1. Crie um projeto e aplique a migration de `supabase/migrations` com `npx supabase link` e `npx supabase db push`, ou execute o SQL no editor do projeto. Confirme que o esquema `public` está exposto na Data API. A migration faz os `GRANT`s explícitos e ativa RLS.
2. Em **Authentication → General Configuration**, desative **Allow new users to sign up**. Mantenha o provedor Email habilitado para o login dos usuários existentes e desative login anônimo. Crie ou convide cada usuário pelo painel **Authentication → Users**. A migration cria o perfil automaticamente quando um usuário é criado; usuários preexistentes recebem um perfil no backfill. No ambiente local, isso corresponde a `[auth].enable_signup = false` e `[auth.email].enable_signup = true`.
3. Configure a **Site URL** e a URL de redirecionamento `https://SEU-DOMINIO/auth/callback` em Authentication. O fluxo de recuperação de senha depende desse redirecionamento e de envio de e-mail configurado.
4. O bucket privado `station-photos` é criado pela migration. Somente integrantes autenticados podem ler fotos; cada pessoa envia e remove arquivos apenas na própria pasta `price-reports/{user-id}/...`. Fotos têm limite de 2 MiB e MIME WebP ou JPEG. Links de leitura expiram após 60 segundos.
5. Revise no painel as políticas e os grants antes de liberar o grupo. Pessoas autenticadas podem ver postos, perfis, preços e comentários; podem registrar preços e comentários, e editar apenas o próprio perfil/comentário. Postos são cadastrados pelo administrador via SQL.

Não reaplique o SQL diretamente em um banco já migrado. Confira `npx supabase migration list` antes de `db push`; esta versão não acrescenta migrations. Nunca configure `service_role` ou secret keys como `NEXT_PUBLIC_*`. Use HTTPS para câmera e geolocalização fora de `localhost`.

## Variáveis

| Variável | Ambiente | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Navegador e servidor | URL do projeto Supabase hospedado, nunca localhost na Vercel |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Navegador e servidor | Chave publishable do mesmo projeto |
| `GEMINI_API_KEY` | Somente servidor | Chave de um projeto Google AI Studio com acesso à Gemini API |
| `GEMINI_MODEL` | Somente servidor | Inicialmente `gemini-3.5-flash-lite`; confirme disponibilidade na sua conta |
| `ORS_API_KEY` | Somente servidor | Chave de acesso ao OpenRouteService Directions |

O modelo é configurável, sem substituição automática. Se a conta não tiver acesso ao modelo configurado, a leitura falha com uma mensagem simples e a digitação continua disponível. Valide o modelo com uma foto de teste após configurar a chave. Não inclua `.env.local` no Git nem compartilhe chaves em capturas de tela.

## Publicar esta versão na Vercel

Estes passos são operacionais: nenhum projeto cloud ou deploy é criado pelos comandos de teste do repositório.

1. Prepare o projeto Supabase conforme a seção anterior. Para um projeto novo, faça `npx supabase login`, `npx supabase link --project-ref SEU_PROJECT_REF`, confira `npx supabase migration list`, depois aplique `npx supabase db push`. O arquivo é `supabase/migrations/20261007001807_initial_schema.sql`. Não use `db reset` em produção nem aplique o seed fictício.
2. Crie as chaves no [Google AI Studio](https://aistudio.google.com/apikey) e no [OpenRouteService](https://openrouteservice.org/dev/). Confirme modelo, cotas e orçamento disponíveis em cada conta. O host de rotas usado é `https://api.heigit.org/openrouteservice`.
3. Confira as alterações, faça commit e envie a versão aprovada ao GitHub. Na Vercel, importe `GustavoVezetiv/Gasoline` (ou abra o projeto já vinculado), selecionando o diretório raiz e o preset **Next.js**. Use Node.js **22.x**, instalação `npm ci`, build `npm run build` e diretório de saída padrão do Next.js.
4. Em **Settings → Environment Variables**, cadastre as cinco variáveis da tabela no ambiente **Production**. Para previews, configure-as também em **Preview**, preferencialmente com um Supabase de testes. Gemini/ORS nunca recebem prefixo `NEXT_PUBLIC_`.
5. Configure `main` como branch de produção se esse for o fluxo de publicação escolhido. Execute o deploy pelo painel; em projetos já vinculados, um push para a branch de produção pode publicar automaticamente. Alterações de variáveis exigem um novo deployment. Consulte a [integração oficial Next.js/Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs).
6. Com o endereço HTTPS definitivo, ajuste no Supabase **Authentication → URL Configuration**: **Site URL** = `https://SEU-DOMINIO` e **Redirect URLs** incluindo `https://SEU-DOMINIO/auth/callback`. Configure SMTP para convites/recuperação, mantenha cadastro público e login anônimo desativados e crie os integrantes em **Authentication → Users**.
7. Cadastre os postos reais em `public.stations` pelo SQL Editor/Table Editor do Supabase, com nome, endereço, latitude, longitude e `active = true`. Verifique que `station-photos` permanece privado e que RLS está ativa. Não há cadastro administrativo de postos no app.
8. Faça o teste de aceite em HTTPS: login/recuperação; registro manual; foto → identificar → revisar → salvar; histórico → Ver foto; mapa → selecionar → Traçar rota → Navegar; depois teste as mesmas ações na PWA instalada. Confira as chamadas reais a Gemini/ORS e as cotas antes de liberar o grupo.

## Uso e decisões

- Cada atualização insere novos `price_reports`; `latest_prices` usa `DISTINCT ON` e `security_invoker`, com índice `(station_id, fuel_type, created_at DESC, id DESC)`. A preferência de combustível fica somente no `localStorage` do dispositivo e é aplicada em resumo, explorador, mapa, detalhes e histórico.
- O mapa é carregado somente no navegador para preservar a renderização do App Router e usa os tiles públicos do OpenStreetMap com a atribuição exigida. Antes de abrir o produto para um volume maior, revise a [política de uso dos tiles](https://operations.osmfoundation.org/policies/tiles/) e adote um provedor compatível se necessário.
- A lista e o cálculo de melhor custo usam Haversine em linha reta. O custo estimado soma litros abastecidos e combustível para ida e volta, usando consumo e litros do perfil. Sem esses dados ou sem localização, a ordenação mostra menor preço. A rota calculada pelo ORS aparece separadamente, como distância **por ruas** e tempo estimado, e não altera essa fórmula.
- Localização é pedida por ação do usuário e é opcional na atualização. Se houver um posto a menos de 300 m, ele é sugerido e pode ser trocado.
- A foto é reduzida a até 1600 px e 2 MiB no navegador. WebP é preferido; JPEG é usado quando WebP não está disponível. O servidor valida formato, tamanho, dimensões e decodificação com Sharp antes de enviar ao Gemini. A imagem só é enviada ao Google ao tocar em **Identificar preços**, após o aviso visível; não se enviam nome do usuário nem localização ao Gemini. Valores com baixa confiança são omitidos e campos já digitados são preservados. Nada é salvo automaticamente.
- **Confirmar e salvar preços** grava os combustíveis preenchidos e envia a foto ao bucket privado, com o mesmo `photo_path` em todos os registros daquele envio. **Ver foto** obtém um link assinado de 60 segundos. A leitura antiga via Tesseract foi removida.
- **Traçar rota** solicita localização e consulta apenas o posto selecionado. A origem é enviada ao ORS junto ao destino cadastrado; a rota é desenhada no Leaflet. As coordenadas são enviadas ao ORS na ordem longitude/latitude. **Navegar** abre o Google Maps com o destino e funciona mesmo sem ORS.
- O service worker usa rede somente: não armazena páginas privadas, respostas do Supabase ou fotos. O aplicativo não oferece uso offline.
- `viewport-fit=cover`, `env(safe-area-inset-*)`, `100dvh`, inputs de 16 px e navegação inferior adaptada ao teclado foram incluídos para Safari no iPhone. Valide câmera, permissões, teclado e instalação em um iPhone real antes de compartilhar com o grupo.

## Verificação

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --omit=dev
```

Os testes cobrem Haversine, custo, frescor, último preço, JSON e resposta incompleta do Gemini, coordenadas/GeoJSON, conversão de distância/duração, URLs de navegação, sessões, CSRF, imagens inválidas, limites e falhas dos provedores. Gemini, ORS e Supabase são simulados nos testes de endpoints; `npm test` não chama serviços externos nem consome créditos. Para testar RLS e a migration em um banco local, inicie Docker/Supabase e execute `npx supabase db reset`; isso reinicializa apenas o banco local.

Na revisão desta versão, a interface foi exercitada no navegador com dados fictícios em larguras de 390 e 320 px: lista/mapa, troca de combustível, seleção, rota simulada, galeria/compressão, aviso antes da análise e preenchimento de campos sem substituir valores manuais. Essa revisão não equivale a testar Safari ou hardware real.

### Endpoints e limites

- `POST /api/analyze-price-photo?station=<uuid>`: corpo binário JPEG/WebP (máximo 2 MiB e 1600 px), retorna `{ prices: [{ fuel_type, price, confidence }] }`. Valida combustível, unicidade, preço entre R$ 1 e R$ 20 e até três casas decimais. Associações com confiança abaixo de 0,8 não são preenchidas.
- `POST /api/route`: JSON `{ origin: { latitude, longitude }, stationId }`. O servidor busca o destino em um posto ativo usando a sessão/RLS, sem aceitar coordenadas de destino fornecidas pelo navegador. Retorna `{ coordinates, distanceKm, durationMinutes }`, com geometria em `[longitude, latitude]`.
- Ambos verificam a sessão Supabase e recusam requisições cross-site e contas anônimas. Respostas são privadas, sem cache. Chaves ficam em módulos `server-only`; erros técnicos e respostas brutas de provedores não são expostos.
- Limite por usuário e por instância: **5 fotos / 10 minutos** e **20 rotas / 10 minutos**. O contador fica em memória e pode reiniciar ou variar entre instâncias serverless. É um controle leve para o grupo privado, não um teto global de gastos; configure cotas nos provedores. Ampliação do público exige um limitador compartilhado.
- Gemini tem timeout de 20 s e saída limitada; ORS, de 12 s. Não há retries automáticos de chamadas pagas. Faltas de chave, limite, timeout e ausência de rota mantêm os caminhos manual/externo.

### Aceite pendente em iPhone real

- Safari: câmera traseira, orientação, fotos HEIC/galeria e fallback JPEG; permissão de localização concedida e recusada.
- Inputs: teclado decimal com vírgula, ausência de zoom, rolagem até o último campo e botão, retorno do teclado sem sobreposição da bottom nav.
- Safe areas em notch/Dynamic Island, rotação, zoom/toque no mapa e abertura/retorno do Google Maps.
- Instalação via **Compartilhar → Adicionar à Tela de Início**, sessão em modo standalone, retorno após suspensão, visualização da foto assinada e comportamento sem rede.
- Repetir câmera, permissões, inputs e navegação no Chrome/Android real. A revisão local não validou chamadas reais de Gemini/ORS nem Auth/Storage hospedados.

## Limitações do MVP

Sem sincronização offline ou cadastro de postos na interface. A IA pode errar em placas inclinadas/reflexivas; sempre revise os valores. A proteção de grupo depende de manter o cadastro público desativado e controlar a criação de contas no Supabase. Configuração das chaves, teste real dos provedores, Auth/Storage hospedados e aceite em dispositivos reais continuam necessários antes de disponibilizar o MVP.

A auditoria de dependências de produção (`npm audit --omit=dev`) não apontou vulnerabilidades na revisão. A auditoria completa indicou cinco alertas derivados de `braces` na cadeia de `eslint-config-next`; a versão publicada de `braces` ainda era 3.0.3, sem correção compatível disponível. Não foi aplicado o downgrade de Next/ESLint sugerido por `npm audit fix --force`.
