# O que falta antes de publicar

As páginas estão escritas e ligadas entre si. O que falta não é código — são
**decisões e dados da barbearia** que ninguém pode inventar. Cada um aparece no
texto como `[algo a definir]` e está marcado em bloco vermelho na própria página,
para não passar batido.

Para achar todos de uma vez:

```
grep -rn "a definir\|a confirmar" *.html
```

---

## Bloqueiam o envio às lojas

| # | O que falta | Onde aparece | Por que bloqueia |
|---|---|---|---|
| 1 | **E-mail de contato/suporte** | política §1 e §9, exclusão, suporte, rodapés | O revisor da loja escreve para esse endereço. Precisa ser um e-mail que alguém lê. |
| 2 | **Prazo de retenção** de agendamento cancelado e de registro financeiro anonimizado | política §8, exclusão | É a pendência já registrada em `seguranca.md` §7 do `app-mr-cuts`. Sem ela não dá para escrever o que se retém — e o Google pergunta isso no formulário de segurança de dados. |
| 3 | **Prazo de atendimento** do pedido de exclusão por e-mail | exclusão | Exigência da página de exclusão do Google Play. |
| 4 | **Revisão jurídica** dos três documentos | política, termos, exclusão | Fui eu que escrevi, a partir das regras de negócio. Não substitui advogado. |
| 5 | **Retirar os avisos de rascunho** | topo da política, dos termos e da exclusão | Depois de 1 a 4 resolvidos. |
| 6 | **Texto legal sobre moeda virtual e pagamento no app** | política, termos | Fases 5–6: moedas, opt-in e checkout online precisam constar antes de ligar gateway. |

## Deixam o site incompleto, mas não bloqueiam

| # | O que falta | Onde aparece |
|---|---|---|
| 7 | **Telefone / WhatsApp** | landing (atalho "Pelo WhatsApp"), suporte |
| 8 | **URL do app web** (agendar pelo site) | landing (atalho "Pelo site"), hoje "Em breve neste endereço" |
| 8b | **Links das lojas** | landing (atalho "Pelo aplicativo"), hoje "Em breve nas lojas" |
| 8c | **URL Flutter web na equipe** | landing `#equipe` — links `/barbeiro/slug` (app captura; Pages ainda precisa redirecionar para o web app) |
| 9 | **Região dos servidores do Supabase** | política §6 — transferência internacional de dados é declaração de LGPD |
| 10 | **Valor da multa por falta** | termos §5. Em `seed.sql` o valor está marcado como provisório; o texto hoje diz que a barbearia define, sem número |
| 11 | **Cancelamento do plano** — prazo, forma e o que acontece com o mês pago | termos §8 |
| 12 | **Domínio** e o arquivo `CNAME` | ver `contas-e-dominio.md` no `app-mr-cuts` |
| 13 | **GitHub Pages ligado** | repositório existe; deploy e HTTPS ainda pendentes |
| 14 | **Captura de tela real do app** | landing — hoje recriação HTML no hero (os PNG gerados em teste Flutter saíram ilegíveis) |
| 15 | **Foto da barbearia e da equipe** | landing, hoje sem imagem própria |
| 16 | **Cardápio de produtos real** | landing `#produtos` — lista provisória; estoque real no app |
| 17 | **Provedor de pagamento contratado** | app — simulador roda; Asaas (ou outro) ainda não integrado |

---

## O que já está preenchido com dado real

Para ninguém sair conferindo o que já foi conferido. Tudo abaixo saiu de
`supabase/seed.sql`, `design/tokens.json` e `docs/regras-de-negocio.md` do
`app-mr-cuts` — não de suposição:

- Os 24 serviços, com preço e duração, e quais saem "a partir de"
- Os 6 planos, com preço e os dias em que cada um vale
- A equipe: Vandinho (dono, atende), Felipe, Breno, e Eliane na recepção
- Slugs dos barbeiros: `vandinho`, `felipe`, `breno` (links placeholder na equipe)
- Endereço: Av. Miguel Perrela, 987 — Lj 18, Castelo, Belo Horizonte — MG, 31330-290
- Jornada: seg–sex 8h–20h, sábado 8h–18h, domingo fechado
- Cidade: Belo Horizonte, MG
- Instagram: `@barbearia_mrcutspremium`
- As regras de agendamento: grade de 10 minutos, até um ano à frente, até 5
  horários em aberto, confirmação automática
- Cancelamento até 3 horas antes; 3 faltas bloqueiam por 15 dias
- Feriado e véspera: assinante paga metade fora do plano
- Desconto não acumula — vence o maior
- Moeda virtual: não saca, não expira (padrão), opt-in do cliente
- Pagamento no app: em breve (simulado em teste); balcão continua
- O que a exclusão de conta apaga e o que ela mantém anonimizado, conferido na
  função `anonimizar_conta` da migração `0015`
