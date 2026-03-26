<div align="center">
  <img src="icons/eagle.png" alt="GamersClub Eagle Logo" width="96" height="96" />
  <h1>GamersClub Eagle 🦅</h1>
  <p><strong>A extensão definitiva para produtividade e vantagem competitiva na Gamers Club.</strong></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
  [![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
  [![CS2 Ready](https://img.shields.io/badge/CS2-Ready-orange.svg)]()
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
</div>

---

## 📖 Sobre o Projeto

A **GamersClub Eagle** é uma extensão de alta performance (Manifest V3) projetada para elevar a experiência dos jogadores na plataforma [Gamers Club](https://gamersclub.com.br/). Ela resolve problemas comuns como perda de tempo de aceitação de partidas e falta de informações contextuais sobre jogadores no lobby.

## ✨ Funcionalidades Principais

| Recurso | Descrição | Status |
| :--- | :--- | :---: |
| **🚀 XP Tracker** | Barra de progresso em tempo real com níveis e estimativas de evolução. | ✅ |
| **⚡ Auto-Accept** | Aceite partidas automaticamente (Modo Instantâneo ou Atraso Humano). | ✅ |
| **📢 Discord Notifier** | Envio do comando `connect` diretamente para seu Discord via Webhook. | ✅ |
| **🏷️ Player Tags** | Marque jogadores (emoji tags) para identificação rápida de parceiros/adversários. | ✅ |
| **🛡️ Privacy First** | Armazenamento local e seguro. Sem coleta de dados externos. | ✅ |

## 🛠️ Tecnologias Utilizadas

- **JavaScript (ES6+)**: Lógica modular e reativa.
- **Service Workers**: Processamento em segundo plano eficiente.
- **Chrome Extension API**: Arquitetura Manifest V3 para máxima compatibilidade e segurança.
- **CSS3 Vanilla**: Interface leve e responsiva injetada diretamente na GC.

## 🚀 Como Instalar (Manual/Developer Mode)

1. Faça o download do repositório como ZIP e extraia.
2. Acesse `chrome://extensions/` no seu navegador.
3. Ative o **Modo do Desenvolvedor** no canto superior direito.
4. Clique em **Carregar sem compactação** e selecione a pasta da extensão.

## ⚙️ Estrutura do Projeto (V3)

```text
src/
├── background/    # Lógica de persistência e roteamento de comandos
├── bridge/        # Injeção de scripts no contexto da página da Gamers Club
├── content/       # Módulos de UI (Matchmaking, Tags, Barra de Progresso)
├── utils/         # Helpers globais e funções de segurança
└── popup/         # UI de configuração rápida
```

## 🤝 Contribuição

Sinta-se à vontade para abrir Issues ou enviar Pull Requests. Toda ajuda para melhorar a experiência competitiva é bem-vinda!

## ⚖️ Licença

Distribuído sob a licença **MIT**. Veja o arquivo `LICENSE` para mais detalhes.

---
<div align="center">
  Desenvolvido por <strong>Andre Mafalda Matter</strong>
</div>
