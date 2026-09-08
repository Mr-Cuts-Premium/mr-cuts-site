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
| `index.html` | Landing da barbearia: cardápio, planos, equipe, demonstração do app e atalhos para marcar |
| `politica-de-privacidade.html` | Exigida pelas duas lojas |
| `termos-de-uso.html` | Regras de agendamento, cancelamento, faltas e planos |
| `exclusao-de-conta.html` | Exigida pelo Google Play, **além** do botão dentro do app |
| `suporte.html` | Contato e perguntas frequentes |
| `estilo.css` | Folha única das cinco páginas |
| `assets/` | Marca em vetor, ícone e a fonte Bodoni Moda |
| `PENDENCIAS.md` | **O que falta preencher antes de publicar** |

## Ver o site na sua máquina

Não precisa de servidor — dá para abrir o `index.html` direto no navegador. Se
preferir servir:

```
python -m http.server 8000
```

E abrir <http://localhost:8000>.

## Decisões que não são acidente

**A paleta e a tipografia saem do app.** Vêm de `design/tokens.json` no
`app-mr-cuts`, que por sua vez saiu do perfil da barbearia. Quem clica no link da
loja e cai aqui precisa reconhecer a mesma casa. Se o app mudar de cor, esta
folha muda junto.

**A fonte é local, não é Google Fonts.** Fonte buscada na rede entrega o IP de
cada visitante a um terceiro — coisa que a política de privacidade teria de
declarar, na própria página da política. Só o Bodoni Moda vem embutido, porque é
a letra do monograma; o corpo usa a pilha de fontes do sistema, e é por isso que
a página carrega rápido. A licença OFL acompanha o arquivo, como ela exige.

**As telas do app na landing são recriação em HTML, não fotografia.** O app ainda
não rodou em aparelho. Mesma paleta, mesma letra e os preços reais do cardápio —
mas quando houver captura de tela de verdade, é para trocar.

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
