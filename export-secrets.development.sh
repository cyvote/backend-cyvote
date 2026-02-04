while IFS='=' read -r key value; do
  if [[ -n "$key" && ! "$key" =~ ^# ]]; then
    gh variable set "$key" \
      --env Development \
      --body "$value"
  fi
done < .env.development
