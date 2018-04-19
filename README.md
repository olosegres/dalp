# dalp

Dalp is a data access layer, proxy.
It is to provide uniform interface to access data from different sources.
You can work with both local data and data on different servers in the uniform way, using standardized queries.

Query subscriptions:
```
dalp.subscribe({
    find: 'article',
    filter: {
        userId: 1,
    },
}, (articles) => { // will be called after first fetch, after any fetched article updates or when new suitable article will be created
    console.log(articles);
});
```

Simple execution:
```
dalp.execute({
    create: 'order',
    data: {
        amount: 7,
        description: 'Test order',
    },
}).then(result => console.log(result));
```