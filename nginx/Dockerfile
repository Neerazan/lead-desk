FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY default.conf /etc/nginx/conf.d/default.conf

USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
