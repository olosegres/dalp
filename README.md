# dalp

Dalp is a data access layer proxy.
It is provide uniform interface to access data from different sources.
You can work with both local data and data on different servers in the same style, using standardized queries.

Simple examples:
```
dalp.execute({
    create: 'order',
    data: {
        amount: 7,
        description: 'Test order',
    },
}).then(result => console.log(result));
