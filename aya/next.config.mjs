/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // As fontes são carregadas via <link> e resolvidas no navegador; não
  // deixamos o build tentar buscá-las (e o ambiente de build pode bloquear o host).
  optimizeFonts: false
};
export default nextConfig;
