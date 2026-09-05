import { InlineScript } from '@/app/inline-script';

const THEME_SCRIPT = `(function(){
  try {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    function apply() {
      var t = document.cookie.split('; ').find(function(c){ return c.indexOf('theme=') === 0; });
      var mode = t ? t.split('=')[1] : 'system';
      var dark = mode === 'dark' || (mode !== 'light' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
    }
    apply();
    mq.addEventListener('change', apply);
  } catch(e){}
})();`;

export function ThemeScript() {
  return <InlineScript html={THEME_SCRIPT} />;
}