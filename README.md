# Gasoline

Aplicação privada para um pequeno grupo acompanhar preços de combustíveis e decidir onde abastecer. A interface prioriza preço, distância aproximada e data da atualização no celular.

## Stack e arquitetura

- Next.js 16 App Router, React 19, TypeScript e Tailwind CSS 4; hospedagem preparada para Vercel. Leaflet renderiza o mapa no cliente com tiles do OpenStreetMap.
- Supabase Auth, PostgreSQL com RLS e Storage privado. O navegador usa apenas a chave **publishable**. Não há service role no código.
- `src/app`: páginas, proteção de sessão e manifest PWA. `src/components`: interface e formulários. `src/lib`: acesso a dados, geolocalização, preço, foto e OCR.
- `supabase/migrations`: esquema versionado, grants e políticas. `supabase/seed.sql`: postos fictícios exclusivos do ambiente local.

## Configuração local

1. Instale Node.js 22 ou superior, Docker Desktop e Supabase CLI.
2. `npm ci`
3. `npx supabase start` e `npx supabase db reset` para aplicar a migration e o seed local. O Docker deve estar em execução.
4. Copie `.env.example` para `.env.local`. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com os valores de `npx supabase status` ou do painel do projeto.
5. `npm run dev` e abra `http://localhost:3000`.

O seed cria seis postos fictícios perto de Cuiabá. Após criar um usuário local, execute `supabase/seed.sql` novamente no SQL Editor local para adicionar histórico de 90 dias dos quatro combustíveis. O seed não é aplicado em produção por `supabase db push`; cadastre os postos reais manualmente no SQL Editor ou em uma migration própria.

## Supabase hospedado

1. Crie um projeto e aplique a migration de `supabase/migrations` com `npx supabase link` e `npx supabase db push`, ou execute o SQL no editor do projeto. Confirme que o esquema `public` está exposto na Data API. A migration faz os `GRANT`s explícitos e ativa RLS.
2. Em **Authentication → General Configuration**, desative **Allow new users to sign up**. Mantenha o provedor Email habilitado para o login dos usuários existentes e desative login anônimo. Crie ou convide cada usuário pelo painel **Authentication → Users**. A migration cria o perfil automaticamente quando um usuário é criado; usuários preexistentes recebem um perfil no backfill. No ambiente local, isso corresponde a `[auth].enable_signup = false` e `[auth.email].enable_signup = true`.
3. Configure a **Site URL** e a URL de redirecionamento `https://SEU-DOMINIO/auth/callback` em Authentication. O fluxo de recuperação de senha depende desse redirecionamento e de envio de e-mail configurado.
4. O bucket privado `station-photos` é criado pela migration. Somente integrantes autenticados podem ler fotos; cada pessoa envia e remove arquivos apenas na própria pasta `price-reports/{user-id}/...`. Fotos têm limite de 2 MiB e MIME WebP ou JPEG. Links de leitura expiram após 60 segundos.
5. Revise no painel as políticas e os grants antes de liberar o grupo. Pessoas autenticadas podem ver postos, perfis, preços e comentários; podem registrar preços e comentários, e editar apenas o próprio perfil/comentário. Postos são cadastrados pelo administrador via SQL.

Para produção, configure as mesmas duas variáveis de `.env.example` no projeto Vercel e faça o deploy do repositório. Nunca configure `service_role` ou secret keys como `NEXT_PUBLIC_*`. Use HTTPS para câmera e geolocalização fora de `localhost`.

## Uso e decisões

- Cada atualização insere novos `price_reports`; `latest_prices` usa `DISTINCT ON` e `security_invoker`, com índice `(station_id, fuel_type, created_at DESC, id DESC)`. A preferência de combustível fica somente no `localStorage` do dispositivo e é aplicada em resumo, explorador, mapa, detalhes e histórico.
- O mapa é carregado somente no navegador para preservar a renderização do App Router e usa os tiles públicos do OpenStreetMap com a atribuição exigida. Antes de abrir o produto para um volume maior, revise a [política de uso dos tiles](https://operations.osmfoundation.org/policies/tiles/) e adote um provedor compatível se necessário.
- Distância é Haversine em linha reta. O custo estimado soma litros abastecidos e combustível para ida e volta, usando consumo e litros do perfil. Sem esses dados ou sem localização, a ordenação mostra menor preço, sem inventar um custo.
- Localização é pedida por ação do usuário e é opcional na atualização. Se houver um posto a menos de 300 m, ele é sugerido e pode ser trocado.
- A foto é reduzida a até 1600 px e 2 MiB no navegador. WebP é preferido; JPEG é usado quando WebP não está disponível. OCR via Tesseract.js é carregado somente sob demanda. Os candidatos nunca são salvos sem confirmação do formulário.
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

Os testes cobrem Haversine, custo, frescor, último preço, validação e parser de OCR. Para testar RLS e a migration em um banco local, inicie Docker/Supabase e execute `npx supabase db reset`; esta etapa requer o serviço Docker ativo.

## Limitações do MVP

Sem rota viária, sincronização offline ou cadastro de postos na interface. OCR pode errar em placas inclinadas/reflexivas; sempre revise os valores. A proteção de grupo depende de manter o cadastro público desativado e controlar a criação de contas no Supabase. A validação em Safari/iPhone real e o deploy dependem do projeto Supabase e do domínio Vercel configurados.
