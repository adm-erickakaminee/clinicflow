-- Configuração do bucket de storage para avatares de perfil

-- Criar bucket se não existir (via SQL direto não é possível, mas podemos usar a API)
-- O bucket deve ser criado manualmente no Dashboard do Supabase ou via API
-- Nome do bucket: 'avatars'
-- Público: true (para permitir acesso às imagens)

-- Políticas de Storage para o bucket 'avatars'

-- Permitir que usuários autenticados façam upload de seus próprios avatares
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir que usuários atualizem seus próprios avatares
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir que usuários deletem seus próprios avatares
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir leitura pública dos avatares (para exibir as imagens)
CREATE POLICY "Public can read avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Nota: O bucket 'avatars' precisa ser criado manualmente no Dashboard do Supabase:
-- 1. Vá em Storage no menu lateral
-- 2. Clique em "New bucket"
-- 3. Nome: avatars
-- 4. Marque como "Public bucket" para permitir acesso público às imagens
-- 5. Opcionalmente, configure tamanho máximo de arquivo (recomendado: 5MB)

