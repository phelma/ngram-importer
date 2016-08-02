docker run --name ngram-postgres --net=host -v /mnt/SSD1TBA/ngrams/NGRAMDB:/NGRAMDB -e PGDATA=/NGRAMDB -e POSTGRES_PASSWORD=omg -e POSTGRES_USER=omg -e POSTGRES_DB=ngram2 -d postgres 
