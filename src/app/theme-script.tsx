/** Script that applies the saved theme + locale before hydration. */
export function themeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){
          try {
            var t = document.cookie.split('; ').find(function(c){ return c.indexOf('theme=') === 0; });
            var theme = t ? t.split('=')[1] : 'light';
            if (theme === 'dark') document.documentElement.classList.add('dark');
          } catch(e){}
        })();`,
      }}
    />
  );
}