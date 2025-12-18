#!/bin/bash

# Script para testar o cadastro da música "Tempo Perdido"
# Uso: ./test-song.sh

API_URL="http://localhost:3002/api"

SONG_TITLE="Tempo Perdido - Legião Urbana"
SONG_CONTENT=$(cat <<'EOF'
<intro bpm="105" bars="4">
[C] [Am] [Dm] [G]
</intro>

<verse bpm="105" bars="8">
[C] Todos os dias quando acordo
[Am] Não tenho mais o tempo que passou
[Dm] Mas tenho muito tempo
[G] Temos todo o tempo do mundo
</verse>

<verse bpm="105" bars="8">
[C] Todos os dias antes de dormir
[Am] Lembro e esqueço como foi o dia
[Dm] Sempre em frente
[G] Não temos tempo a perder
</verse>

<chorus bpm="110" bars="8">
[C] Nosso suor sagrado
[Am] É bem mais belo que esse sangue amargo
[Dm] E tão sério
[G] E selvagem, selvagem
</chorus>

<verse bpm="105" bars="8">
[C] Veja o sol dessa manhã tão cinza
[Am] A tempestade que chega é da cor dos teus olhos
[Dm] Castanhos
[G] Então me abraça forte
</verse>

<chorus bpm="110" bars="8">
[C] Me diz mais uma vez que já estamos
[Am] Distantes de tudo
[Dm] Temos nosso próprio tempo
[G] Temos nosso próprio tempo
</chorus>

<bridge bpm="100" bars="4">
[F] Tempo perdido
[G] Tempo perdido
</bridge>

<verse bpm="105" bars="8">
[C] Todos os dias quando acordo
[Am] Não tenho mais o tempo que passou
[Dm] Mas tenho muito tempo
[G] Temos todo o tempo do mundo
</verse>

<outro bpm="105" bars="4">
[C] [Am] [Dm] [G]
</outro>
EOF
)

echo "🎵 Cadastrando música: $SONG_TITLE"
echo ""

# Criar a música
RESPONSE=$(curl -s -X POST "$API_URL/songs" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"$SONG_TITLE\",\"content\":$(echo "$SONG_CONTENT" | jq -Rs .)}")

if [ $? -eq 0 ]; then
  echo "✅ Música cadastrada com sucesso!"
  echo ""
  echo "$RESPONSE" | jq '.'
  echo ""
  echo "🌐 Acesse http://localhost:5174 para ver a música no teleprompter!"
else
  echo "❌ Erro ao cadastrar música"
  echo "$RESPONSE"
fi

