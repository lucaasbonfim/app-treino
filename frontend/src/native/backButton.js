import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

// Integra o botão físico "voltar" do Android ao histórico do app.
// Sem isso, o Android executa o comportamento padrão (fechar o app) em qualquer tela.
// Com isso, "voltar" navega para a tela anterior e só sai do app quando não há
// mais histórico (ex.: na tela inicial), como em um app nativo.
export function registerAndroidBackButton() {
  // No navegador (web) não há botão físico: não faz nada.
  if (!Capacitor.isNativePlatform()) return;

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });
}
