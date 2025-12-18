# Exemplo de Uso - Tempo Perdido (Legião Urbana)

## Arquivo XML de Exemplo

Foi criado um arquivo de exemplo com a música "Tempo Perdido" da Legião Urbana:

📄 **Arquivo**: `exemplo-tempo-perdido.xml`

## Como Cadastrar a Música

### Opção 1: Via Interface Web

1. Acesse http://localhost:5174
2. Clique no botão **"+"** no sidebar
3. Cole o conteúdo do arquivo `exemplo-tempo-perdido.xml` no campo de texto
4. Clique em **"Save"**

### Opção 2: Via API (curl)

```bash
curl -X POST http://localhost:3002/api/songs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Tempo Perdido - Legião Urbana",
    "content": "<intro bpm=\"105\" bars=\"4\">\n[C] [Am] [Dm] [G]\n</intro>\n\n<verse bpm=\"105\" bars=\"8\">\n[C] Todos os dias quando acordo\n[Am] Não tenho mais o tempo que passou\n[Dm] Mas tenho muito tempo\n[G] Temos todo o tempo do mundo\n</verse>\n..."
  }'
```

### Opção 3: Via Script

```bash
./test-song.sh
```

## Estrutura do XML

O XML segue o formato do protocolo:

```xml
<secao bpm="105" bars="8">
[C] Texto da letra
[Am] Mais texto
</secao>
```

### Tipos de Seções Suportadas:

- `<intro>` - Introdução
- `<verse>` - Verso
- `<chorus>` - Refrão
- `<bridge>` - Ponte
- `<outro>` - Finalização

### Parâmetros:

- **bpm**: Batidas por minuto (velocidade da música)
- **bars**: Número de compassos (duração da seção)

### Acordes:

Os acordes são indicados entre colchetes: `[C]`, `[Am]`, `[Dm]`, etc.

## Testando o Teleprompter

1. Cadastre a música (usando uma das opções acima)
2. Clique na música na lista do sidebar
3. Clique no botão **Play** ▶️
4. Observe o scroll automático ajustando a velocidade conforme:
   - O BPM de cada seção
   - O número de barras
   - A altura do conteúdo

## Música Cadastrada

✅ A música "Tempo Perdido - Legião Urbana" já foi cadastrada automaticamente para teste!

Acesse http://localhost:5174 e você verá a música na lista.

