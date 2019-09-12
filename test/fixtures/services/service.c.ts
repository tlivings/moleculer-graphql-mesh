
import { createGraphQLMixin } from '../../../src/index';

const c = createGraphQLMixin({
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
  dependencies: ['gqlB']
});

export = {
  name: 'gqlC',
  mixins: [c]
};
