const path = require('path');

module.exports = {
    mode: 'development',
    entry: {
        home: './src/home.ts',
        error: './src/error.ts',
        418: './src/special/418.ts',
        login: './src/login.ts',
        register: './src/register.ts',
        apps: './src/apps/apps.ts',
        users: './src/apps/users.ts',
        judge: './src/judge/main.ts',
        rating_simulator: './src/apps/rating_simulator/index.ts',
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.s[ac]ss$/i,
                use: ['style-loader', 'css-loader', 'sass-loader'],
            },
        ],
    },
};
