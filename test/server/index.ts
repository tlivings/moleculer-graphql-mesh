
import { ServiceBroker } from 'moleculer';
import { a, b, c } from '../fixtures';

const broker = new ServiceBroker({
  nodeID: 'test',
  //transporter: 'nats://0.0.0.0:4222',
  logLevel: 'info',
  cacher: 'memory'
});

broker.createService({
  name: 'gqlA',
  mixins: [ a ]
});

broker.createService({
  name: 'gqlB',
  mixins: [ b ]
});

broker.createService({
  name: 'gqlC',
  mixins: [ c ]
});

broker.start().then(() => {
  broker.waitForServices(['gqlA', 'gqlB', 'gqlC']).then(() => {
    broker.call('gqlC.$graphql', {
      input: `
        query {
          b {
            id
            value
            a {
              value
            }
          }
          a(id: 1) {
            id
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