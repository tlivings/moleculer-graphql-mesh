
import { ServiceBroker } from 'moleculer';
import { createGraphQLMixin } from '../../src/index';

const broker = new ServiceBroker({
  nodeID: 'test',
  //transporter: 'nats://0.0.0.0:4222',
  logLevel: 'info',
  cacher: 'memory'
});

const graphql1 = createGraphQLMixin({
  types: `
    type A {
      id: ID,
      value: String
    }
    type Query {
      a: A
    }
  `,
  resolvers: {
    Query: {
      a() {
        return { id: 1, value: 'hello A' };
      }
    }
  }
});

const graphql2 = createGraphQLMixin({
  types: `
    type B {
      id: ID,
      value: String
      a: A
    }
    type Query {
      b: B
    }
  `,
  resolvers: {
    Query: {
      b() {
        return { id: 1, value: 'hello B', a: { id: 1, value: 'fetched A from B' } };
      }
    }
  },
  dependencies: ['gql1']
});

const graphql3 = createGraphQLMixin({
  types: `
    type C {
      id: ID,
      value: String
    }
    type Query {
      c: C
    }
  `,
  resolvers: {
    Query: {
      c() {
        return { id: 1, value: 'hello C' };
      }
    }
  },
  dependencies: ['gql2']
});

broker.createService({
  name: 'gql1',
  mixins: [ graphql1 ]
});

broker.createService({
  name: 'gql2',
  mixins: [ graphql2 ]
});

broker.createService({
  name: 'gql3',
  mixins: [ graphql3 ]
});

broker.start().then(() => {
  broker.waitForServices(['gql1', 'gql2', 'gql3']).then(() => {
    broker.call('gql3.execute', {
      input: `
        query {
          b {
            id,
            value,
            a {
              value
            }
          }
          a {
            value
          }
        }
      `,
      context: {}
    }).then((result) => {
      console.log(JSON.stringify(result, null, 2));
    });
  });

});