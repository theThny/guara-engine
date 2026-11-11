import httpx, json

payload = {
    'nome_fantasia': 'Supermercado Xereta',
    'socio_nome': 'Jonaldo Soares Guedes',
    'nicho': 'Supermercado',
    'cidade': 'Malacacheta',
    'avaliacao_media': 4.5,
    'total_avaliacoes': 260
}

resp = httpx.post(
    'http://localhost:11434/api/generate',
    json={
        'model': 'qwen2.5:7b',
        'prompt': f'Crie um pitch de WhatsApp cirúrgico e direto para o proprietário {payload["socio_nome"]} do {payload["nome_fantasia"]} em {payload["cidade"]}. Responda em JSON com a chave "pitch_sugerido".',
        'stream': False,
        'format': 'json'
    },
    timeout=60.0
)
print('Ollama Status:', resp.status_code)
print(resp.json().get('response'))
