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

## Deixam o site incompleto, mas não bloqueiam

| # | O que falta | Onde aparece |
|---|---|---|
| 6 | **Endereço da barbearia** | landing (atalhos e rodapé), suporte |
| 7 | **Telefone / WhatsApp** | landing (atalho "Pelo WhatsApp"), suporte |
| 8 | **Links das lojas** | landing (atalho "Pelo aplicativo"), hoje escrito "Em breve nas lojas" |
| 9 | **Região dos servidores do Supabase** | política §6 — transferência internacional de dados é declaração de LGPD |
| 10 | **Valor da multa por falta** | termos §5. Em `seed.sql` o valor está marcado como provisório; o texto hoje diz que a barbearia define, sem número |
| 11 | **Cancelamento do plano** — prazo, forma e o que acontece com o mês pago | termos §8 |
| 12 | **Domínio** e o arquivo `CNAME` | ver `contas-e-dominio.md` no `app-mr-cuts` |
| 13 | **Captura de tela real do app** | landing — hoje as telas são recriação em HTML |
| 14 | **Foto da barbearia e da equipe** | landing, hoje sem imagem própria |

---

## O que já está preenchido com dado real

Para ninguém sair conferindo o que já foi conferido. Tudo abaixo saiu de
`supabase/seed.sql`, `design/tokens.json` e `docs/regras-de-negocio.md` do
`app-mr-cuts` — não de suposição:

- Os 24 serviços, com preço e duração, e quais saem "a partir de"
- Os 6 planos, com preço e os dias em que cada um vale
- A equipe: Vandinho (dono, atende), Felipe, Breno, e Eliane na recepção
- Jornada: segunda a sábado, 8h às 20h
- Cidade: Belo Horizonte, MG
- Instagram: `@barbearia_mrcutspremium`
- As regras de agendamento: grade de 10 minutos, até um ano à frente, até 5
  horários em aberto, confirmação automática
- Cancelamento até 3 horas antes; 3 faltas bloqueiam por 15 dias
- Feriado e véspera: assinante paga metade fora do plano
- Desconto não acumula — vence o maior
- O que a exclusão de conta apaga e o que ela mantém anonimizado, conferido na
  função `anonimizar_conta` da migração `0015`
