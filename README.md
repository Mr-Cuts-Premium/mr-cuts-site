# mr-cuts-site

Site público da barbearia **MR CUT'S PREMIUM** e as páginas legais exigidas pela
App Store e pelo Google Play.

HTML estático, sem framework e sem passo de build. São arquivos que qualquer
pessoa consegue editar daqui a dois anos sem instalar nada — abrir num editor de
texto, salvar, commitar.

## Por que este repositório é separado do código do app

O `app-mr-cuts` é **privado**, e o GitHub Pages em repositório privado exige plano
pago. Além do custo, há três razões que valem por si:

- **Nada sensível deveria estar num repositório público.** O `app-mr-cuts` tem as
  migrações, a RLS e a lógica de segurança inteira. As políticas, ao contrário,
  são conteúdo público por definição.
- **Ciclos diferentes.** A política muda quando muda o tratamento de dado; o app
  muda toda sprint.
- **A URL precisa ser permanente.** Apple e Google guardam esses links na ficha do
  app. Se o repositório do código for reestruturado, o link não pode quebrar.

## O que tem aqui

| Arquivo | O que é |
|---|---|
| `index.html` | Landing da barbearia: cardápio, combos, pacotes, vantagens do app, equipe e atalhos para marcar |
| `politica-de-privacidade.html` | Exigida pelas duas lojas |
| `termos-de-uso.html` | Regras de agendamento, cancelamento, faltas e planos |
| `exclusao-de-conta.html` | Exigida pelo Google Play, **além** do botão dentro do app |
| `suporte.html` | Contato e perguntas frequentes |
| `estilo.css` | Folha única das cinco páginas |
| `assets/` | Marca em vetor, ícone e as fontes Bodoni Moda e Archivo |
| `PENDENCIAS.md` | **O que falta preencher antes de publicar** |

## Ver o site na sua máquina

Não precisa de servidor — dá para abrir o `index.html` direto no navegador. Se
preferir servir:

```
python -m http.server 8000
```

E abrir <http://localhost:8000>.

## Sincronizar a vitrine com o app

Serviços, combos, pacotes, produtos, VIP, convite e aniversário têm
fallback estático no `index.html`. Na carga da página, o `cardapio.js`
consulta a API REST do Supabase e monta de novo cada seção. Se a consulta
falhar, o HTML original permanece na tela. Se o dono desligar uma regra
(pacote sem faixa, aniversário em zero, nenhum VIP), a seção some.

A chave usada no navegador deve ser a chave pública `anon`, protegida
pelas políticas de leitura da tabela no Supabase.

Preencha `cardapio-config.js` com a URL pública do projeto e a chave
`anon`. O padrão já contempla:

- `servicos` — cardápio (VIP sai da lista comum e ganha seção própria;
  combo ganha etiqueta e seção com as partes)
- `combo_itens` — o que entra em cada combo, e a economia em relação à soma
- `regras_pacote` — faixas de desconto do pacote
- `produtos` — itens à venda
- `barbearia` — desconto de convite, moedas de indicação, aniversário e
  prazos da casa

O preço é armazenado em centavos e o site divide por 100 antes de
exibi-lo.

Para atualizar a linha de base estática antes de publicar, use Node 18 ou
mais recente e defina as mesmas informações no ambiente. No PowerShell:

```powershell
$env:SUPABASE_URL = 'https://seu-projeto.supabase.co'
$env:SUPABASE_ANON_KEY = 'sua-chave-anon'
node gerar-cardapio.js
```

O gerador usa `SUPABASE_PRICE_DIVISOR=100` por padrão, como o app. Altere essa
variável somente se o banco passar a armazenar preços em reais.

O script reescreve os trechos entre os marcadores `CARDAPIO`, `COMBOS`,
`PACOTES`, `PRODUTOS` e `VIP`, e atualiza os números de convite,
aniversário, cancelamento e intervalo. É uma conveniência para manter o
fallback atualizado; a sincronização em tempo real do `cardapio.js`
continua sendo a garantia contra preços antigos.

## Decisões que não são acidente

**A paleta e a tipografia saem do app.** Vêm de `design/tokens.json` no
`app-mr-cuts`, que por sua vez saiu do perfil da barbearia. Quem clica no link da
loja e cai aqui precisa reconhecer a mesma casa. Se o app mudar de cor, esta
folha muda junto.

**A fonte é local, não é Google Fonts.** Fonte buscada na rede entrega o IP de
cada visitante a um terceiro — coisa que a política de privacidade teria de
declarar, na própria página da política. A licença OFL acompanha cada arquivo,
como ela exige.

**Desde o redesenho de 09/2026, o corpo usa Archivo, a mesma do app.** Antes era
a pilha do sistema, e a diferença era visível: site e aplicativo não pareciam a
mesma casa. **A troca custa 658 KB** no arquivo da fonte — por isso ela entra com
`font-display: swap`: o texto aparece na hora, na fonte do sistema, e troca
quando a Archivo chega. Quem estiver medindo carregamento vai ver esse peso; ele
é a decisão, não um descuido.

**As telas do app na landing são recriação em HTML, não fotografia.** Tentativa de
trocar por captura gerada em teste Flutter (sem as fontes da marca) saiu ilegível —
texto virou retângulo. Os mocks HTML voltam até existir captura de aparelho boa o
bastante. A moeda no site é o mesmo PNG do app, a arte que o dono entregou.

**`.nojekyll` existe de propósito.** Sem ele o GitHub Pages roda o Jekyll e ignora
arquivos e pastas que começam com underscore. Não usamos nenhum hoje, e é
exatamente o tipo de armadilha que só aparece depois.

## Publicar

O Pages **ainda não foi ligado**. Quando for:

1. `Settings → Pages → Source: Deploy from a branch → main / (root)`
2. Registrar o domínio (ver `docs/contas-e-dominio.md` no `app-mr-cuts`)
3. Criar o arquivo `CNAME` com o domínio, apontar o DNS e esperar o HTTPS
4. Cadastrar as URLs no Play Console e no App Store Connect

Antes do passo 4, resolver o `PENDENCIAS.md` — as páginas legais estão marcadas
como rascunho e dizem isso ao leitor.
